'use client';

export interface QuantityStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}

export default function QuantityStepper({ qty, onInc, onDec }: QuantityStepperProps) {
  return (
    <span className="inline-flex shrink-0 items-center border-2 border-brand rounded-lg overflow-hidden text-sm">
      <button
        onClick={onDec}
        aria-label="Decrease quantity"
        className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center bg-brand text-accent font-bold text-lg hover:bg-accent hover:text-brand transition"
      >
        −
      </button>
      <span className="w-11 sm:w-12 text-center font-extrabold">{qty}</span>
      <button
        onClick={onInc}
        aria-label="Increase quantity"
        className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center bg-brand text-accent font-bold text-lg hover:bg-accent hover:text-brand transition"
      >
        +
      </button>
    </span>
  );
}