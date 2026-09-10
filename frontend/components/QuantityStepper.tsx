'use client';

export interface QuantityStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}

export default function QuantityStepper({ qty, onInc, onDec }: QuantityStepperProps) {
  return (
    <span className="inline-flex items-center border-2 border-brand rounded-lg overflow-hidden text-sm">
      <button
        onClick={onDec}
        className="w-9 h-9 flex items-center justify-center bg-brand text-accent font-bold text-lg hover:bg-accent hover:text-brand transition"
      >
        −
      </button>
      <span className="w-12 text-center font-extrabold">{qty}</span>
      <button
        onClick={onInc}
        className="w-9 h-9 flex items-center justify-center bg-brand text-accent font-bold text-lg hover:bg-accent hover:text-brand transition"
      >
        +
      </button>
    </span>
  );
}