import { Builder, By, until } from 'selenium-webdriver';
import retry from 'async-retry';
import 'chromedriver';
import ora from 'ora';
import dotenv from 'dotenv';

dotenv.config();

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

    async selectDropdownOption(locator, optionText) {
        let dropdown = await this.waitForElement(locator);
        await dropdown.click();
        let option = await this.driver.findElement(By.xpath(`//a[text()='${optionText}']`));
        await option.click();
    }

    async selectMultiDropdownOption(locator, options) {
        let dropdown = await this.waitForElement(locator);
        await dropdown.click();
        for (let optionText of options) {
            let option = await this.driver.findElement(By.xpath(`//label[text()='${optionText}']/preceding-sibling::input`));
            await option.click();
        }
        await dropdown.click(); // Close the dropdown
    }
}

class TransfereGovAutomator {
    constructor(spinner) {
        this.spinner = spinner;
        this.seleniumHelper = null;
        this.status = 'Initialized';
        this.errors = [];
        this.results = [];
        this.isTrainingEnvironment = process.env.HOMOLOG === 'true';
    }

    async initialize() {
        const chrome = await import('selenium-webdriver/chrome.js');
        let options = new chrome.Options();
        options.addArguments(
            "--headless",
            "--start-maximized", 
            "--disable-extensions", 
            "--disable-gpu", 
            "--disable-dev-shm-usage", 
            "--no-sandbox", 
            "--disable-logging", 
            "--disable-notifications", 
            "--disable-infobars", 
            "--ignore-certificate-errors"
        );
        options.setUserPreferences({
            'profile.managed_default_content_settings.images': 1,
            'intl.accept_languages': 'en-GB'
        });

        this.seleniumHelper = new SeleniumHelper(options);
    }

    getLoginCredentials() {
        return this.isTrainingEnvironment
            ? { username: process.env.USUARIO_TRANSFERE_GOV_HOMOLOG, password: process.env.SENHA_TRANSFERE_GOV_HOMOLOG }
            : { username: process.env.USUARIO_TRANSFERE_GOV_PROD, password: process.env.SENHA_TRANSFERE_GOV_PROD };
    }

    getBaseUrl() {
        return this.isTrainingEnvironment
            ? 'https://tre.'
            : 'https://';
    }

    async login() {
        try {
            const { username, password } = this.getLoginCredentials();
            let loginUrl = `${this.getBaseUrl()}idp.transferegov.sistema.gov.br/idp/login`;

            // Remove "tre" se estiver em produção
            if (!this.isTrainingEnvironment) {
                loginUrl = loginUrl.replace('tre.', '');
            }

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

export { TransfereGovAutomator, SeleniumHelper, showMessage };
