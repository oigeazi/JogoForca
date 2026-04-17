function GameModal({ modalType, onRetryRound, onConfirmNo, onClose }) {
  if (!modalType) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        {modalType === "retry-round" && (
          <>
            <p className="gate-eyebrow">Mais uma chance</p>
            <h3>Essa rodada vai recomecar.</h3>
            <p>As letras voltam ao inicio para você tentar de novo.</p>
            <button className="primary-button" onClick={onRetryRound}>
              Tentar novamente
            </button>
          </>
        )}

        {modalType === "confirm-no" && (
          <>
            <p className="gate-eyebrow">Tem certeza?</p>
            <h3>Pense bem...</h3>
            <div className="proposal-actions proposal-actions--modal">
              <button className="secondary-button" onClick={onConfirmNo}>
                TENHO
              </button>
              <button className="primary-button" onClick={onClose}>
                MUDEI DE IDEIA
              </button>
            </div>
          </>
        )}

        {modalType === "wrong-answer" && (
          <>
            <p className="gate-eyebrow">Ops...</p>
            <h3>Resposta errada 😡.</h3>
            <button className="primary-button" onClick={onClose}>
              Quero mais uma chance
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default GameModal;
