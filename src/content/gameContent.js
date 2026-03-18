import officialTrackFile from "../assets/Música Comemoração.mp3";
import romanticTrackFile from "../assets/Música Romântica.mp3";

export const COMPLIMENT_OPTIONS = [
  "Você está linda",
  "Você é linda",
  "Você é bonita",
  "Você me encanta",
  "Você é incrível",
  "Você é especial",
  "Você é radiante",
  "Você é maravilhosa",
  "Que noite agradável",
  "Que noite ótima",
  "Que sorriso lindo",
  "Que charme incrível",
  "Que beleza rara",
  "Você brilha muito",
  "Você alegra tudo",
];

export const PROPOSAL_PHRASE = "QUER NAMORAR COMIGO?";
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const MAX_ERRORS = 6;
export const ROMANTIC_TRACK = romanticTrackFile;
export const OFFICIAL_TRACK = officialTrackFile;

export const HEARTS = Array.from({ length: 10 }, (_, index) => ({
  id: `heart-${index}`,
  left: `${6 + index * 9}%`,
  delay: `${index * 0.45}s`,
  size: `${18 + (index % 4) * 8}px`,
}));

export const POLAROIDS = [
  "Nosso sorriso favorito",
  "Um dia para lembrar",
  "Mais uma história juntos",
];
