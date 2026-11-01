'use strict';

// One source for visible tool content in generated HTML and runtime navigation.
const listContent = {
  "choose": {
    "heading": "Slumpa namn och egna alternativ",
    "intro": "Välj namn, skapa grupper eller blanda en lista.",
    "help": "Välj en vinnare, kvällens film eller vem som börjar.",
    "detailTitle": "Välj slumpmässigt från din egen lista",
    "paragraphs": [
      "Skriv eller klistra in ett alternativ per rad och välj hur många du vill dra. Du kan till exempel välja vem som börjar, en vinnare, kvällens film eller vilken restaurang ni ska besöka.",
      "Välj utan upprepningar om varje rad bara ska dras en gång under omgången. Du kan spara namngivna listor i din webbläsare och återanvända dem för grupper och turordningar."
    ]
  },
  "groups": {
    "heading": "Dela in i slumpmässiga grupper",
    "intro": "Skapa jämna lag eller grupper från en lista med namn.",
    "help": "Dela in deltagare i lag, arbetsgrupper eller par.",
    "detailTitle": "Slumpa grupper till klassrummet, mötet eller matchen",
    "paragraphs": [
      "Lägg in deltagarnas namn och välj antal grupper eller max personer per grupp. Verktyget fördelar deltagarna så jämnt som möjligt och visar i förväg hur stora grupperna blir.",
      "Använd grupperna för klassuppgifter, workshops eller lagspel. När du har skapat minst fyra lag kan du fortsätta till ett slutspel med samma lag och välja vinnare i matcherna."
    ]
  },
  "list": {
    "heading": "Blanda en lista",
    "intro": "Slumpa en turordning för namn, presentationer eller egna alternativ.",
    "help": "Slumpa en turordning, presentationsordning eller spellista.",
    "detailTitle": "Slumpa startordning och presentationsordning",
    "paragraphs": [
      "Skriv ett namn, en uppgift eller ett annat alternativ per rad. Blanda placerar alla rader i en ny slumpmässig ordning och visar dem i en numrerad lista.",
      "Använd listan för att bestämma presentationsordning, startordning i ett spel eller i vilken ordning uppgifter ska göras. Kopiera resultatet om du vill ta med turordningen till en annan app."
    ]
  }
};
const decisionContent = {
  "coin": {
    "heading": "Singla slant",
    "intro": "Låt krona eller klave avgöra vem som börjar eller vilket alternativ du väljer.",
    "help": "Avgör vem som börjar eller välj mellan två alternativ.",
    "detailTitle": "Krona eller klave när du behöver ett enkelt val",
    "paragraphs": [
      "Bestäm vilket alternativ som motsvarar krona och vilket som motsvarar klave. Singla sedan slanten för att till exempel avgöra vem som börjar ett spel.",
      "Varje kast är en ny slumpning, så samma sida kan visas flera gånger i följd. I resultatvyn kan du singla igen och se tidigare kast under historiken."
    ]
  },
  "yes": {
    "heading": "Slumpa ja eller nej",
    "intro": "Låt slumpen ge ett ja eller nej till en enkel fråga.",
    "help": "Få ett slumpmässigt svar på en fråga med två alternativ.",
    "detailTitle": "Ett slumpmässigt ja eller nej",
    "paragraphs": [
      "Formulera en fråga som kan besvaras med ja eller nej och låt slumpen välja ett av svaren. Du behöver inte skriva in frågan i verktyget.",
      "Ja och nej har samma chans vid varje slumpning. Samma svar kan därför komma flera gånger i rad; räknaren i resultatvyn visar att en ny slumpning har gjorts."
    ]
  },
  "dice": {
    "heading": "Kasta tärning",
    "intro": "Slå en eller flera tärningar till sällskapsspel, rollspel eller egna lekar.",
    "help": "Välj antal tärningar och hur många sidor de ska ha.",
    "detailTitle": "Digitala tärningar för sällskapsspel och rollspel",
    "paragraphs": [
      "Välj hur många tärningar du vill kasta och vilken typ du behöver: d4, d6, d8, d10, d12, d20 eller d100. Resultatet visar varje tärning och deras sammanlagda summa.",
      "Tryck på en tärning för att låsa värdet. Nästa kast slumpar bara de olåsta tärningarna, vilket är användbart i spel där du vill behålla delar av ett kast."
    ]
  }
};
const toolLinks = [
  {
    "key": "choose",
    "label": "Slumpa namn",
    "path": "",
    "fragment": "#valj"
  },
  {
    "key": "groups",
    "label": "Dela in grupper",
    "path": "dela-in-i-grupper/",
    "fragment": ""
  },
  {
    "key": "list",
    "label": "Blanda lista",
    "path": "slumpa-lista/",
    "fragment": ""
  },
  {
    "key": "numbers",
    "label": "Slumpa nummer",
    "path": "slumpa-nummer/",
    "fragment": ""
  },
  {
    "key": "coin",
    "label": "Singla slant",
    "path": "singla-slant/",
    "fragment": ""
  },
  {
    "key": "yes",
    "label": "Ja eller nej",
    "path": "ja-eller-nej/",
    "fragment": ""
  },
  {
    "key": "dice",
    "label": "Kasta tärning",
    "path": "kasta-tarning/",
    "fragment": ""
  }
];
module.exports = {listContent, decisionContent, toolLinks};
