import officialTrackFile from "../assets/Música Comemoração.mp3";
import romanticTrackFile from "../assets/Música Romântica.mp3";
import polaroid01 from "../assets/Polaroid-01.jpg";
import polaroid02 from "../assets/Polaroid-02.jpg";
import polaroid03 from "../assets/Polaroid-03.jpg";

export const COMPLIMENT_OPTIONS = [
  "Você está linda",
  "Você é linda",
  "Você é bonita",
  "Você me encanta",
  "Você é incrível",
  "Você é especial",
  "Você é radiante",
  "Você é maravilhosa",
  "Que tarde agradável",
  "Que feriado ótimo",
  "Que sorriso lindo",
  "Que charme incrível",
  "Que beleza rara",
  "Você brilha muito",
  "Você alegra tudo",
];

export const PROPOSAL_PHRASE = "QUER NAMORAR COMIGO?";
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const MAX_ERRORS = 8;
export const ROMANTIC_TRACK = romanticTrackFile;
export const OFFICIAL_TRACK = officialTrackFile;

export const HEARTS = Array.from({ length: 10 }, (_, index) => ({
  id: `heart-${index}`,
  left: `${6 + index * 9}%`,
  delay: `${index * 0.45}s`,
  size: `${34 + (index % 4) * 16}px`,
  rotate: `${[-25, 0, 5, -8, 18][index % 5]}deg`,
}));

export const POLAROIDS = [
  {
    image: polaroid01,
    label: "O melhor aniversário",
  },
  {
    image: polaroid02,
    label: "Visitinha especial",
  },
  {
    image: polaroid03,
    label: "Um passeio no shopping",
  },
];
