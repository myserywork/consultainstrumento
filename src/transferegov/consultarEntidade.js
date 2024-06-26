import { By } from 'selenium-webdriver';
import ora from 'ora';
import { TransfereGovAutomator, showMessage } from '../transferegov/transferegov.js';
import { logger, envManager } from '../di.js';
import dotenv from 'dotenv';

dotenv.config();

export async function consultarEntidade(req, res) {
    if (!req.body) {
        res.status(400).json({ status: 'Erro', mensagem: 'Requisição inválida, sem dados no corpo.' });
        return;
    }

    const { cnpj, nome, uf, municipio, categoria, areasAtuacao } = req.body;
    const spinner = ora('Processando...').start();
    let transfereGov = new TransfereGovAutomator(spinner);

    try {
        await transfereGov.initialize();
        await transfereGov.login();
        
        // Navegar diretamente para a página de consulta
        await transfereGov.seleniumHelper.navigateTo('https://transfere.transferegov.sistema.gov.br/habilitacao/consulta-entidade.html');
        await showMessage("Navegou para a página de consulta de entidade.", spinner);

        await transfereGov.seleniumHelper.driver.sleep(1000);

        let isOnPage = await transfereGov.seleniumHelper.waitForElement(By.id('frmConsulta-cnpj-group'), 3000);

        if (!isOnPage) {
            res.status(200).json({ status: 'Página não encontrada', resultados: [], erros: transfereGov.getErrors() });
            return;
        }

        let response = await consultarEntidadeTGOV(transfereGov, { cnpj, nome, uf, municipio, categoria, areasAtuacao }, spinner);

        if (response) {
            res.status(200).json({ status: 'Sucesso', resultados: response, erros: transfereGov.getErrors() });
            return;
        }

        res.status(200).json({ status: transfereGov.getStatus(), erros: transfereGov.getErrors() });
    } catch (error) {
        res.status(500).json({ status: 'Erro', mensagem: error.message, erros: transfereGov.getErrors() });
    } finally {
        spinner.stop();
    }
}

async function consultarEntidadeTGOV(transfereGov, { cnpj, nome, uf, municipio, categoria, areasAtuacao }, spinner) {
    try {
        if (cnpj) await transfereGov.seleniumHelper.enterText(By.id('frmConsulta-cnpj'), cnpj);
        if (nome) await transfereGov.seleniumHelper.enterText(By.id('frmConsulta-nome'), nome);
        if (uf) await transfereGov.seleniumHelper.selectDropdownOption(By.id('frmConsulta-uf'), uf);
        if (municipio) await transfereGov.seleniumHelper.selectDropdownOption(By.id('frmConsulta-municipio'), municipio);
        if (categoria) await transfereGov.seleniumHelper.selectDropdownOption(By.id('frmConsulta-categoria'), categoria);
        if (areasAtuacao) await transfereGov.seleniumHelper.selectMultiDropdownOption(By.id('frmConsulta-areasAtuacao-combo'), areasAtuacao);

        await showMessage(`Preencheu os dados da consulta`, spinner);

        await transfereGov.seleniumHelper.clickElement(By.id("btnPesquisar"));
        await showMessage("Botão de consulta clicado.", spinner);

        await transfereGov.seleniumHelper.waitForElement(By.id('tblResultados'));
        await showMessage(`Consulta realizada com sucesso.`, spinner);

        let resultados = await extrairResultados(transfereGov);

        return resultados;
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage(`Erro ao consultar a entidade: ${error.message}`, spinner);
        return null;
    }
}

async function extrairResultados(transfereGov) {
    let resultados = [];
    try {
        let rows = await transfereGov.seleniumHelper.driver.findElements(By.css('#tblResultados tbody tr'));
        for (let row of rows) {
            let result = {};
            let entidadeElement = await row.findElement(By.css('a[data-entidade="a"]'));
            let entidade = await entidadeElement.getText();
            let cnpj = await entidadeElement.getAttribute('data-cnpj');

            result.entidade = entidade;
            result.cnpj = cnpj;

            await entidadeElement.click();
            await showMessage(`Clicou na entidade ${entidade}`, transfereGov.spinner);

            let detalhes = await extrairDetalhes(transfereGov);
            result = { ...result, ...detalhes };

            resultados.push(result);

            // Navigate back to the results page
            await transfereGov.seleniumHelper.driver.navigate().back();
            await transfereGov.seleniumHelper.waitForElement(By.id('tblResultados'));
        }
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage(`Erro ao extrair resultados: ${error.message}`, transfereGov.spinner);
    }
    return resultados;
}

async function extrairDetalhes(transfereGov, attempts = 0) {
    let detalhes = {};
    try {
        const tabIds = ['abaDadosBasicos', 'abaEstatuto', 'abaDiretoriaOuResponsaveis', 'abaMembros'];

        for (let tabId of tabIds) {
            await transfereGov.seleniumHelper.clickElement(By.id(tabId));
            await transfereGov.seleniumHelper.driver.sleep(4000);  // Wait for the tab content to load

            switch (tabId) {
                case 'abaDadosBasicos':
                    detalhes.dadosBasicos = await extrairDadosBasicos(transfereGov);
                    break;
                case 'abaEstatuto':
                    detalhes.estatuto = await extrairEstatuto(transfereGov);
                    break;
                case 'abaDiretoriaOuResponsaveis':
                    detalhes.responsaveis = await extrairResponsaveis(transfereGov);
                    break;
                case 'abaMembros':
                    detalhes.membros = await extrairMembros(transfereGov);
                    break;
            }
        }
    } catch (error) {
        transfereGov.errors.push(error.message);
        await showMessage(`Erro ao extrair detalhes: ${error.message}`, transfereGov.spinner);
        
        if (attempts < 3) {
            await showMessage('Tentando novamente...', transfereGov.spinner);
            await transfereGov.seleniumHelper.driver.navigate().refresh();
            await transfereGov.seleniumHelper.driver.sleep(5000); // Aguarda a página recarregar
            return await extrairDetalhes(transfereGov, attempts + 1);
        } else {
            await showMessage('Falha ao extrair detalhes após várias tentativas.', transfereGov.spinner);
        }
    }
    return detalhes;
}

async function extrairDadosBasicos(transfereGov) {
    try {
        return {
            cnpj: await transfereGov.seleniumHelper.getElementText(By.id('txtCNPJ')),
            razaoSocial: await transfereGov.seleniumHelper.getElementText(By.id('txtRazaoSocial')),
            nomeFantasia: await transfereGov.seleniumHelper.getElementText(By.id('txtNomeFantasia')),
            cnaePrimario: await transfereGov.seleniumHelper.getElementText(By.id('txtCnaePrimario')),
            cnaeSecundario: await transfereGov.seleniumHelper.getElementText(By.id('txtCnaeSecundario')),
            dataAbertura: await transfereGov.seleniumHelper.getElementText(By.id('txtDataCNPJ')),
            naturezaJuridica: await transfereGov.seleniumHelper.getElementText(By.id('naturezaJuridica')),
            endereco: await transfereGov.seleniumHelper.getElementText(By.id('txtEndereco')),
            telefone: await transfereGov.seleniumHelper.getElementText(By.id('txtTelefone')),
            email: await transfereGov.seleniumHelper.getElementText(By.id('txtEmail'))
        };
    } catch (error) {
        transfereGov.errors.push(`Erro ao extrair dados básicos: ${error.message}`);
        return {};
    }
}

async function extrairEstatuto(transfereGov) {
    try {
        return {
            descricaoEstatuto: await transfereGov.seleniumHelper.getElementText(By.id('txtEstatuto')),
        };
    } catch (error) {
        transfereGov.errors.push(`Erro ao extrair estatuto: ${error.message}`);
        return {};
    }
}

async function extrairResponsaveis(transfereGov) {
    try {
        return {
            dataInicioMandato: await transfereGov.seleniumHelper.getElementText(By.id('txtDataInicioMandato')),
            dataFimMandato: await transfereGov.seleniumHelper.getElementText(By.id('txtDataFimMandato')),
            historicoMandatos: await extrairTabela(transfereGov, 'tblHistoricoMandato-body', ['Início do Mandato', 'Término do Mandato']),
            dirigentes: await extrairTabela(transfereGov, 'tabelaDirigentes', ['Nome', 'CPF', 'Cargo/Função'])
        };
    } catch (error) {
        transfereGov.errors.push(`Erro ao extrair responsáveis: ${error.message}`);
        return {};
    }
}

async function extrairMembros(transfereGov) {
    try {
        return await extrairTabela(transfereGov, 'tblMembros-body', ['CPF', 'Nome', 'Cargo/Função']);
    } catch (error) {
        transfereGov.errors.push(`Erro ao extrair membros: ${error.message}`);
        return [];
    }
}

async function extrairTabela(transfereGov, tableId, headers) {
    let data = [];
    try {
        let rows = await transfereGov.seleniumHelper.driver.findElements(By.css(`#${tableId} tr`));
        for (let row of rows) {
            let rowData = {};
            let cells = await row.findElements(By.css('td'));
            for (let i = 0; i < cells.length; i++) {
                rowData[headers[i]] = await cells[i].getText();
            }
            data.push(rowData);
        }
    } catch (error) {
        transfereGov.errors.push(`Erro ao extrair tabela ${tableId}: ${error.message}`);
    }
    return data;
}
