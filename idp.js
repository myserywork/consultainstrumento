import express from 'express';
import { Builder, By, until } from 'selenium-webdriver';
import fs from 'fs';
import path from 'path';
import retry from 'async-retry';
import 'chromedriver';
import ora from 'ora';

const app = express();
const port = 3000;

app.use(express.json());

async function showMessage(message, spinner = null) {
    if (spinner) {
        (await spinner).info(message);
    } else {
        console.log(message);
    }
}

class SeleniumHelper {
    constructor(options) {
        this.driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();
        this.driver.manage().setTimeouts({ implicit: 3000 });
    }

    async close() {
        await this.driver.quit();
    }

    async waitForElement(locator, timeout = 10000) {
        return await retry(async () => this.driver.wait(until.elementLocated(locator), timeout));
    }

    async clickElement(locator) {
        let element = await this.waitForElement(locator);
        await element.click();
    }

    async enterText(locator, text) {
        let element = await this.waitForElement(locator);
        await element.sendKeys(text);
    }

    async navigateTo(url) {
        await this.driver.get(url);
    }

    async getElementText(locator) {
        let element = await this.waitForElement(locator);
        return await element.getText();
    }
}

class TransfereGovAutomator {
    constructor(spinner) {
        this.spinner = spinner;
        this.seleniumHelper = null;
        this.status = 'Initialized';
        this.errors = [];
        this.results = [];
    }

    async initialize() {
        const chrome = await import('selenium-webdriver/chrome.js');
        let options = new chrome.Options();
        options.addArguments("--start-maximized", "--disable-extensions", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox", "--disable-logging", "--disable-notifications", "--disable-infobars", "--ignore-certificate-errors");
        options.setUserPreferences({
            'profile.managed_default_content_settings.images': 1,
            'intl.accept_languages': 'en-GB'
        });

        this.seleniumHelper = new SeleniumHelper(options);
    }

    async login(username, password, loginUrl) {
        try {
            await this.seleniumHelper.navigateTo(loginUrl);
            await showMessage("Navegador aberto. Acessando URL de login.", this.spinner);

            await this.seleniumHelper.enterText(By.name('j_username'), username);
            await showMessage("Usuário inserido.", this.spinner);

            await this.seleniumHelper.enterText(By.name('j_password'), password);
            await showMessage("Senha inserida.", this.spinner);

            await this.seleniumHelper.clickElement(By.name('sSubmit'));
            await showMessage("Botão de login clicado.", this.spinner);

            await this.seleniumHelper.waitForElement(By.id('menuPrincipal'));
            await showMessage("Login realizado com sucesso!", this.spinner);

            this.status = 'Login successful';
        } catch (error) {
            this.status = 'Login failed';
            this.errors.push(error.message);
            await showMessage("Falha no login: " + error, this.spinner);
            throw error;
        }
    }

    async navigateToMenu(menuText) {
        try {
            let menuItems = await this.seleniumHelper.driver.findElements(By.css('#menuPrincipal .button.menu'));
            for (let item of menuItems) {
                let text = await item.getText();
                if (text === menuText) {
                    await item.click();
                    await showMessage(`Clicou no menu: ${menuText}`, this.spinner);
                    await this.seleniumHelper.waitForElement(By.xpath(`//div[contains(text(),'${menuText}')]`));
                    await showMessage(`Navegou para o menu: ${menuText}`, this.spinner);
                    return;
                }
            }

            let execucaoDiv = await this.seleniumHelper.driver.findElements(By.css('div.button.menu[href="#EXECUCAO"]'));
            if (execucaoDiv.length > 0) {
                await execucaoDiv[0].click();
                await showMessage("Clicou no menu Execução usando o novo seletor.", this.spinner);
                return;
            }

            let errorMsg = `Menu com texto "${menuText}" não encontrado.`;
            this.errors.push(errorMsg);
            await showMessage(errorMsg, this.spinner);
        } catch (error) {
            this.errors.push(error.message);
            await showMessage(`Falha ao clicar no menu ${menuText}: ` + error, this.spinner);
        }
    }

    async clickLinkByText(linkText) {
        try {
            await this.seleniumHelper.clickElement(By.linkText(linkText));
            await showMessage(`Clicou no link: ${linkText}`, this.spinner);
            await this.seleniumHelper.waitForElement(By.xpath(`//a[contains(text(),'${linkText}')]`));
            await showMessage(`Navegou para o link: ${linkText}`, this.spinner);
        } catch (error) {
            this.errors.push(error.message);
            await showMessage(`Falha ao clicar no link ${linkText}: ` + error, this.spinner);
        }
    }

    async preencherFormularioConsulta(numeroConvenio) {
        try {
            await this.seleniumHelper.enterText(By.name('numeroConvenio'), numeroConvenio);
            await showMessage(`Preencheu o número do convênio: ${numeroConvenio}`, this.spinner);

            await this.seleniumHelper.clickElement(By.css("input[name='consultarPropostaPreenchaOsDadosDaConsultaConsultarForm'][value='Consultar']"));
            await showMessage("Botão de consulta clicado.", this.spinner);

            await this.seleniumHelper.waitForElement(By.id('listaResultado'));
            await showMessage(`Consulta do convênio ${numeroConvenio} realizada com sucesso.`, this.spinner);

            this.status = `Instrumento ${numeroConvenio} consultado`;
        } catch (error) {
            this.errors.push(error.message);
            await showMessage(`Falha ao consultar o instrumento ${numeroConvenio}: ` + error, this.spinner);
        }
    }

    async verificarSeNenhumRegistroFoiEncontrado() {
        try {
            let bodyText = await this.seleniumHelper.getElementText(By.tagName('body'));
            if (bodyText.includes("Nenhum registro foi encontrado")) {
                await showMessage("Nenhum registro foi encontrado.", this.spinner);
                return true;
            }
            return false;
        } catch (error) {
            this.errors.push(error.message);
            await showMessage("Falha ao verificar se nenhum registro foi encontrado: " + error, this.spinner);
            return false;
        }
    }

    async clicarInstrumento(numeroConvenio) {
        try {
            await this.seleniumHelper.waitForElement(By.css('#row'));
            await this.seleniumHelper.clickElement(By.xpath(`//a[contains(text(),'${numeroConvenio}')]`));
            await showMessage(`Clicou no instrumento: ${numeroConvenio}`, this.spinner);
        } catch (error) {
            this.errors.push(error.message);
            await showMessage(`Falha ao clicar no instrumento ${numeroConvenio}: ` + error, this.spinner);
        }
    }

    async navegarParaLinkFinal() {
        try {
            const finalUrl = 'https://discricionarias.transferegov.sistema.gov.br/voluntarias/execucao/ListarLicitacoes/ListarLicitacoes.do?destino=ListarLicitacoes';
            await this.seleniumHelper.navigateTo(finalUrl);
            await showMessage(`Navegou para o link final: ${finalUrl}`, this.spinner);

            await this.seleniumHelper.waitForElement(By.xpath("//div[@id='licitacoes']"));
            await showMessage("Tabela de listagem encontrada.", this.spinner);

            let tabela = await this.seleniumHelper.driver.findElement(By.css('#licitacoes'));
            let linhas = await tabela.findElements(By.css('tbody tr'));
            let resultados = [];

            for (let linha of linhas) {
                let numero = await linha.findElement(By.css('td:nth-child(1) div')).getText();
                let processoExecucao = await linha.findElement(By.css('td:nth-child(2) div')).getText();
                let dataPublicacao = await linha.findElement(By.css('td:nth-child(3) div')).getText();
                let numeroProcesso = await linha.findElement(By.css('td:nth-child(4) div')).getText();
                let situacao = await linha.findElement(By.css('td:nth-child(5) div')).getText();
                let situacaoOrigem = await linha.findElement(By.css('td:nth-child(6) div')).getText();
                let sistemaOrigem = await linha.findElement(By.css('td:nth-child(7) div')).getText();
                let aceiteExecucao = await linha.findElement(By.css('td:nth-child(8) div')).getText();

                resultados.push({
                    numero: numero,
                    processoExecucao: processoExecucao,
                    dataPublicacao: dataPublicacao,
                    numeroProcesso: numeroProcesso,
                    situacao: situacao,
                    situacaoOrigem: situacaoOrigem,
                    sistemaOrigem: sistemaOrigem,
                    aceiteExecucao: aceiteExecucao
                });

                if (aceiteExecucao === "Aguardando Aceite") {
                    let detalharLink = await linha.findElement(By.xpath("//a[contains(text(),'Detalhar')]"));
                    await detalharLink.click();
                    await showMessage("Clicou em Detalhar.", this.spinner);

                    await this.seleniumHelper.waitForElement(By.id('dataEnvioAceite'));
                    let dataEnvio = await this.seleniumHelper.getElementText(By.id('dataEnvioAceite'));
                    await showMessage(`Data de envio para aceite: ${dataEnvio}`, this.spinner);

                    resultados[resultados.length - 1]['dataEnvioAceite'] = dataEnvio;

                    await this.seleniumHelper.driver.navigate().back();
                    await showMessage("Retornou à página de listagem de licitações.", this.spinner);
                }
            }
            this.results = resultados;
        } catch (error) {
            this.errors.push(error.message);
            await showMessage("Falha ao navegar e extrair dados da listagem: " + error, this.spinner);
        }
    }

    async close() {
        if (this.seleniumHelper) {
            await this.seleniumHelper.close();
            await showMessage("Navegador fechado com sucesso!", this.spinner);
        }
    }

    getStatus() {
        return this.status;
    }

    getErrors() {
        return this.errors;
    }
}

app.post('/processar', async (req, res) => {
    const spinner = ora('Processando...').start();
    let { instrumento } = req.body;
    let transfereGov = new TransfereGovAutomator(spinner);

    let username = '05434961129';
    let password = 'Coopera@2024';

    try {
        await transfereGov.initialize();
        await showMessage("Faça login no sistema", spinner);
        await transfereGov.login(username, password, 'https://idp.transferegov.sistema.gov.br/idp/login');
        await transfereGov.navigateToMenu('Execução');
        await transfereGov.clickLinkByText('Consultar Instrumentos/Pré-Instrumentos');
        await transfereGov.preencherFormularioConsulta(instrumento);

        let nenhumRegistroEncontrado = await transfereGov.verificarSeNenhumRegistroFoiEncontrado();
        if (nenhumRegistroEncontrado) {
            res.status(200).json({ status: 'Nenhum registro encontrado', resultados: [], erros: transfereGov.getErrors() });
            return;
        }

        await transfereGov.clicarInstrumento(instrumento);
        await transfereGov.navegarParaLinkFinal();

        res.status(200).json({ status: transfereGov.getStatus(), resultados: transfereGov.results, erros: transfereGov.getErrors() });
    } catch (error) {
        res.status(500).json({ status: 'Erro', mensagem: error.message, erros: transfereGov.getErrors() });
    } finally {
        await transfereGov.close();
        spinner.stop();
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
