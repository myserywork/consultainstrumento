const { default: OpenAI } = require("openai")


let openai = new OpenAI({ apiKey: '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' });




const getChatCompletion = async (content, role = "user") => {
    // Get a simple response without message history by directly providing a prompt

    const completion = await openai.chat.completions.create({
        messages: [{ role: role, content: content }],
        model: "gpt-3.5-turbo",
      });
  
      return completion.choices[0].message.content;
}


// async block
(async () => {
    console.log(await getChatCompletion('Olá, tudo bem?'))
})();