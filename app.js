require("dotenv").config();

const TOKEN = process.env.TOKEN;
const API_URL = process.env.API_URL;

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const sha1 = require("js-sha1");
const FormData = require("form-data");

const ANSWER_FILE_PATH = path.join(__dirname, "answer.json");
const RESULT_FILE_PATH = path.join(__dirname, "result.json");

let ATTEMPTS = 0;

const ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z"
];

function resolve(answer) {
  function containsInAlphabet(value) {
    return ALPHABET.some(
      letter => letter.toLowerCase() === value.toLowerCase()
    );
  }

  function getIndexOf(value) {
    return ALPHABET.findIndex(
      letter => letter.toLowerCase() === value.toLowerCase()
    );
  }

  function getLetterAtIndex(index) {
    if (index < 0) return ALPHABET[ALPHABET.length + index];

    return ALPHABET[index];
  }

  const keys = answer.numero_casas;

  const encrypted = answer.cifrado;
  let decrypted = "";

  encrypted.split("").forEach(letter => {
    if (containsInAlphabet(letter)) {
      const indexOfLetter = getIndexOf(letter);

      letter = getLetterAtIndex(indexOfLetter - keys);
    }

    decrypted += letter;
  });

  return {
    decifrado: decrypted,
    resumo_criptografico: sha1(decrypted)
  };
}

async function submit(answer, answerFilePath) {
  return new Promise(async (resolve, reject) => {
    if (Object.keys(answer).some(key => answer[key].length <= 0)) reject();

    const form = new FormData();
    form.append("answer", fs.createReadStream(answerFilePath));

    console.log("Submitting...");

    await fetch(API_URL + `/submit-solution?token=${TOKEN}`, {
      method: "POST",
      body: form
    }).then(response => {
      if (response.status !== 200) {
        reject();
        return;
      }

      fs.writeFile(RESULT_FILE_PATH, JSON.stringify(response), () => {});

      resolve();
    });

    reject();
  });
}

function run() {
  if (ATTEMPTS > 3) {
    console.log("[!] Too many attempts, start the script again.");
    return;
  }

  ATTEMPTS++;

  fs.readFile(ANSWER_FILE_PATH, { encoding: "utf-8" }, async (error, data) => {
    if (error) {
      await fetch(API_URL + `/generate-data?token=${TOKEN}`).then(response => {
        response = response.json();

        fs.writeFile(ANSWER_FILE_PATH, response, () => {});

        data = response;
      });
    }

    if (typeof data === "string") data = JSON.parse(data);

    submit(data, ANSWER_FILE_PATH)
      .then(() => console.log("[!] Successfully submitted."))
      .catch(async () => {
        const toWrite = resolve(data);

        await fs.writeFile(
          ANSWER_FILE_PATH,
          JSON.stringify({ ...data, ...toWrite }),
          () => {}
        );

        console.log("Failed to submit, trying again in 3 seconds.");
        setTimeout(() => run(), 3000);
      });
  });
}

run();
