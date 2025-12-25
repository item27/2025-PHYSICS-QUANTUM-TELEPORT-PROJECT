import './formula-backdrop.css';

function FormulaBackdrop() {
  return (
    <div className="formula-backdrop" aria-hidden>
      <div className="formula-backdrop__layer">|ψ⟩ = α|0⟩ + β|1⟩ · ⊗ · |Φ⁺⟩ · σₓ · σ_z</div>
      <div className="formula-backdrop__layer">∣Φ⁺⟩ = (|00⟩ + |11⟩)/√2 · coherence · entanglement</div>
      <div className="formula-backdrop__layer">phase ⟳ drift · measurement → collapse · classical bits</div>
    </div>
  );
}

export default FormulaBackdrop;
