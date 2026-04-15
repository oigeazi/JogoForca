function HangmanDrawing({ errors }) {
  const parts = [
    <line key="base" x1="16" y1="220" x2="144" y2="220" />,
    <line key="pole" x1="52" y1="220" x2="52" y2="24" />,
    <line key="beam" x1="52" y1="24" x2="136" y2="24" />,
    <line key="rope" x1="136" y1="24" x2="136" y2="52" />,
    <circle key="head" cx="136" cy="82" r="24" />,
    <path
      key="hair-left"
      d="M116 63 C106 48, 94 55, 97 69 C100 81, 92 88, 88 95"
      fill="none"
    />,
    <path
      key="hair-right"
      d="M156 63 C166 48, 178 55, 175 69 C172 81, 180 88, 184 95"
      fill="none"
    />,
    <polygon key="body" points="136,108 110,164 162,164" fill="none" />,
    <line key="arm-left" x1="128" y1="120" x2="100" y2="140" />,
    <line key="arm-right" x1="144" y1="120" x2="172" y2="140" />,
    <line key="leg-left" x1="126" y1="164" x2="108" y2="198" />,
    <line key="leg-right" x1="146" y1="164" x2="164" y2="198" />,
  ];

  return (
    <svg
      className="hangman-svg"
      viewBox="0 0 196 240"
      role="img"
      aria-label={`Forca com ${errors} erros`}>
      {parts.map((part, index) => (
        <g
          key={part.key}
          className={
            index < errors + 4
              ? "hangman-part hangman-part--visible"
              : "hangman-part"
          }>
          {part}
        </g>
      ))}
    </svg>
  );
}

export default HangmanDrawing;
