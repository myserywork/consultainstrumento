import figlet from 'figlet';

// Função para gerar texto estilizado
function generateStylizedText(text, font) {
    figlet.text(text, { font }, (err, data) => {
        if (err) {
            console.log('Something went wrong...');
            console.dir(err);
            return;
        }
        console.log(data);
    });
}



// Exemplo de uso



export const hello = () => {
    generateStylizedText('WATSON CONVENIOS', 'Slant');
    console.clear();
}

export const header = () => {
    console.clear();
    generateStylizedText('WATSON CONVENIOS', 'Slant');
}