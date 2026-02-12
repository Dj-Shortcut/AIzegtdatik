const FALLBACKS = {
  mentor: {
    low: "Houd koers: kleine, consistente stappen brengen je verder.",
    medium: "Je bent dichterbij dan je denkt; focus op de volgende haalbare stap.",
    high: "Adem in, herpak je richting, en zet vandaag één moedige stap vooruit.",
  },
  rebel: {
    low: "Breek het patroon subtiel: kies één ding dat jij vandaag anders doet.",
    medium: "Durf de status quo te challengen; jouw aanpak mag scherp en origineel zijn.",
    high: "Dit is je moment om regels te herschrijven en je stem voluit te laten horen.",
  },
  sage: {
    low: "Helderheid komt uit rust: observeer, weeg af, en kies bewust.",
    medium: "Verbind feiten met gevoel; wijsheid zit in de nuance tussen beide.",
    high: "In de ruis ligt inzicht verborgen: vertraag en laat het patroon zichtbaar worden.",
  },
  explorer: {
    low: "Neem een kleine afslag buiten je routine en kijk wat het je oplevert.",
    medium: "Nieuw terrein vraagt lef; probeer iets dat je nog niet eerder deed.",
    high: "Volg je nieuwsgierigheid radicaal: avontuur begint precies waar zekerheid stopt.",
  },
};

export function getDeterministicFallback(archetype, drama) {
  return FALLBACKS[archetype]?.[drama] ?? "Blijf in beweging; progressie ontstaat stap voor stap.";
}
