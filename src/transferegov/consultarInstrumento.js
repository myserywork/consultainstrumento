import { By } from 'selenium-webdriver';
import ora from 'ora';
import { TransfereGovAutomator, showMessage } from '../transferegov/transferegov.js';
import { InstrumentoModel } from '../di.js';
import { logger, envManager } from '../di.js';
import dotenv from 'dotenv';

dotenv.config();

async function consultarInstrumento(req, res) {
    const { id } = req.query;
    const spinner = ora('Processando...').start();
    let transfereGov = new TransfereGovAutomator(spinner);

    try {
        await transfereGov.initialize();
        await transfereGov.login();
        await transfereGov.navigateToMenu('Execução');
        await transfereGov.clickLinkByText('Consultar Instrumentos/Pré-Instrumentos');

        // Preencher formulário de consulta
        await preencherFormularioConsulta(transfereGov, id, spinner);

        // Verificar se nenhum registro foi encontrado
        let nenhumRegistroEncontrado = await verificarSeNenhumRegistroFoiEncontrado(transfereGov, spinner);
        if (nenhumRegistroEncontrado) {
            res.status(200).json({ status: 'Nenhum registro encontrado', resultados: [], erros: transfereGov.getErrors() });
            return;
        }

        // Clicar no instrumento
        await clicarInstrumento(transfereGov, id, spinner);

        // Navegar para o link final
        const finalUrl = `${transfereGov.getBaseUrl()}discricionarias.transferegov.sistema.gov.br/voluntarias/execucao/ListarLicitacoes/ListarLicitacoes.do?destino=ListarLicitacoes`;

        await transfereGov.seleniumHelper.navigateTo(finalUrl);
        await showMessage(`Navegou para o link final: ${finalUrl}`, spinner);

   

        await extrairDadosDaListagem(transfereGov, id, spinner);

        res.status(200).json({ status: transfereGov.getStatus(), resultados: transfereGov.results, erros: transfereGov.getErrors() });
    } catch (error) {
        res.status(500).json({ status: 'Erro', mensagem: error.message, erros: transfereGov.getErrors() });
    } finally {
        await transfereGov.close();
        spinner.stop();
    }
}

async function preencherFormularioConsulta(transfereGov, numeroConvenio, spinner) {
    try {
        await transfereGov.seleniumHelper.enterText(By.name('numeroConvenio'), numeroConvenio);
        await showMessage(`Preencheu o número do convênio: ${numeroConvenio}`, spinner);

        await transfereGov.seleniumHelper.clickElement(By.css("input[name='consultarPropostaPreenchaOsDadosDaConsultaConsultarForm'][value='Consultar']"));
        await showMessage("Botão de consulta clicado.", spinner);

        await transfereGov.seleniumHelper.waitForElement(By.id('listaResultado'));
        await showMessage(`Consulta do convênio ${numeroConvenio} realizada com sucesso.`, spinner);

        transfereGov.status = `Instrumento ${numeroConvenio} consultado`;
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage(`Falha ao consultar o instrumento ${numeroConvenio}: ` + error, spinner);
    }
}

async function verificarSeNenhumRegistroFoiEncontrado(transfereGov, spinner) {
    try {
        let bodyText = await transfereGov.seleniumHelper.getElementText(By.tagName('body'));
        if (bodyText.includes("Nenhum registro foi encontrado")) {
            await showMessage("Nenhum registro foi encontrado.", spinner);
            return true;
        }
        return false;
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage("Falha ao verificar se nenhum registro foi encontrado: " + error, spinner);
        return false;
    }
}

async function clicarInstrumento(transfereGov, numeroConvenio, spinner) {
    try {
        await transfereGov.seleniumHelper.waitForElement(By.css('#row'));
        await transfereGov.seleniumHelper.clickElement(By.xpath(`//a[contains(text(),'${numeroConvenio}')]`));
        await showMessage(`Clicou no instrumento: ${numeroConvenio}`, spinner);
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage(`Falha ao clicar no instrumento ${numeroConvenio}: ` + error, spinner);
    }
}

async function extrairDadosDaListagem(transfereGov, numeroConvenio, spinner) {
    try {
        await transfereGov.seleniumHelper.waitForElement(By.xpath("//div[@id='licitacoes']"));
        await showMessage("Tabela de listagem encontrada.", spinner);

        let tabela = await transfereGov.seleniumHelper.driver.findElement(By.css('#licitacoes'));
        let linhas = await tabela.findElements(By.css('tbody tr'));
        let resultados = [];

        for (let linha of linhas) {
            let numero = await linha.findElement(By.css('td:nth-child(1) div')).getText();
            let processoExecucao = await linha.findElement(By.css('td:nth-child(2) div')).getText();
            let dataPublicacao = await linha.findElement(By.css('td:nth-child(3) div')).getText();
            let numeroProcesso = await linha.findElement(By.css('td:nth-child(4) div')).getText();
            let situacao = await linha.findElement(By.css('td:nth-child(5) div')).getText();
            let situacaoOrigem = await linha.findElement(By.css('td:nth-child(6) div')).getText() || 'N/A'; // Default value if missing
            let sistemaOrigem = await linha.findElement(By.css('td:nth-child(7) div')).getText();
            let aceiteExecucao = await linha.findElement(By.css('td:nth-child(8) div')).getText();

            let dataEnvioAceite = '';
            if (aceiteExecucao === "Aguardando Aceite") {
                let detalharLink = await linha.findElement(By.xpath("//a[contains(text(),'Detalhar')]"));
                await detalharLink.click();
                await showMessage("Clicou em Detalhar.", spinner);

                await transfereGov.seleniumHelper.waitForElement(By.id('dataEnvioAceite'));
                dataEnvioAceite = await transfereGov.seleniumHelper.getElementText(By.id('dataEnvioAceite'));
                await showMessage(`Data de envio para aceite: ${dataEnvioAceite}`, spinner);

                await transfereGov.seleniumHelper.driver.navigate().back();
                await showMessage("Retornou à página de listagem de licitações.", spinner);
            }

            // Ensure all required fields are captured correctly
            if (!situacao || !numero || !processoExecucao || !dataPublicacao || !numeroProcesso || !sistemaOrigem || !aceiteExecucao) {
                transfereGov.errors.push(`Missing required field: situacao: ${situacao}, numero: ${numero}, processoExecucao: ${processoExecucao}, dataPublicacao: ${dataPublicacao}, numeroProcesso: ${numeroProcesso}, sistemaOrigem: ${sistemaOrigem}, aceiteExecucao: ${aceiteExecucao}`);
                continue;
            }

           const instrumento = {
                numeroConvenio,
                numero,
                processoExecucao,
                dataPublicacao,
                numeroProcesso,
                situacao,
                situacaoOrigem,
                sistemaOrigem,
                aceiteExecucao,
                dataEnvioAceite,
                usuario: transfereGov.isTrainingEnvironment ? process.env.USUARIO_TRANSFERE_GOV_HOMOLOG : process.env.USUARIO_TRANSFERE_GOV_PROD,
                environment: transfereGov.isTrainingEnvironment ? 'homolog' : 'prod'
            }

        
            resultados.push({
                numero,
                processoExecucao,
                dataPublicacao,
                numeroProcesso,
                situacao,
                situacaoOrigem,
                sistemaOrigem,
                aceiteExecucao,
                dataEnvioAceite
            });
        }
        transfereGov.results = resultados;
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage("Falha ao navegar e extrair dados da listagem: " + error, spinner);
    }
}

export default consultarInstrumento;
