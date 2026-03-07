function HangmanDrawing({ errors }) {
  const parts = [
    <line key="base" x1="16" y1="220" x2="144" y2="220" />,
    <line key="pole" x1="52" y1="220" x2="52" y2="24" />,
    <line key="beam" x1="52" y1="24" x2="136" y2="24" />,
    <line key="rope" x1="136" y1="24" x2="136" y2="52" />,
    <circle key="head" cx="136" cy="74" r="22" />,
    <line key="body" x1="136" y1="96" x2="136" y2="146" />,
    <line key="arm-left" x1="136" y1="110" x2="108" y2="128" />,
    <line key="arm-right" x1="136" y1="110" x2="164" y2="128" />,
    <line key="leg-left" x1="136" y1="146" x2="112" y2="182" />,
    <line key="leg-right" x1="136" y1="146" x2="160" y2="182" />,
  ]

  return (
    <svg
      className="hangman-svg"
      viewBox="0 0 180 240"
      role="img"
      aria-label={`Forca com ${errors} erros`}
    >
      {parts.map((part, index) => (
        <g key={part.key} className={index < errors + 4 ? 'hangman-part hangman-part--visible' : 'hangman-part'}>
          {part}
        </g>
      ))}
    </svg>
  )
}

export default HangmanDrawing
