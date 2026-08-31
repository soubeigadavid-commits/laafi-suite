"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-laafi-bronze px-4 py-2 text-sm font-medium text-white hover:bg-laafi-bronze/90"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
