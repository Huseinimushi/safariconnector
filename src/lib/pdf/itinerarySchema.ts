export type PdfSection = {
  heading: string;
  content: string[];
};

export type PdfPayload = {
  title: string;
  subtitle?: string;
  clientName?: string;
  clientEmail?: string;
  operatorName?: string;
  date: string; // ISO or readable
  sections: PdfSection[];
};
