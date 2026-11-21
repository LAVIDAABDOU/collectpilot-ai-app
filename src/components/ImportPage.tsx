import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Sparkles, Upload } from 'lucide-react';
import type { Invoice } from '@/types';
import { parseInvoices } from '@/lib/csv';
import { SAMPLE_CSV } from '@/lib/sampleData';

interface Props {
  onImport: (invoices: Invoice[]) => void;
  existingCount: number;
}

export default function ImportPage({ onImport, existingCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ added: number; errors: string[]; duplicates: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleText = (text: string, name: string | null) => {
    setFileName(name);
    const res = parseInvoices(text, []);
    onImport(res.invoices);
    setResult({ added: res.invoices.length, errors: res.errors, duplicates: res.duplicates });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result ?? ''), file.name);
    reader.onerror = () =>
      setResult({ added: 0, errors: ['The file could not be read. Make sure it is a plain .csv file.'], duplicates: 0 });
    reader.readAsText(file);
  };

  const reset = () => {
    setResult(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload your agency's invoice export as a CSV file. Days Overdue and Balance are calculated automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300'
        }`}
      >
        <FileUp className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">Drag &amp; drop your CSV here</p>
        <p className="mt-0.5 text-xs text-slate-400">or</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Choose CSV file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {fileName && <p className="mt-4 text-xs text-slate-500">Loaded: {fileName}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          Expected columns
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['Client Name', true],
            ['Invoice Number', true],
            ['Invoice Date', false],
            ['Due Date', true],
            ['Amount', true],
            ['Paid Amount', false],
            ['Status', false],
            ['Email', false],
          ].map(([col, required]) => (
            <span
              key={col as string}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                required ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-50 text-slate-500 ring-slate-200'
              }`}
            >
              {col as string}
              {required ? ' *' : ''}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">* required. Column names are matched flexibly (e.g. "Client", "Amount Due").</p>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Don't have a file handy? Try it with a sample agency dataset.
          </p>
          <button
            onClick={() => handleText(SAMPLE_CSV, 'sample-agency-data.csv')}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Sparkles className="h-4 w-4" />
            Load Sample Agency Data
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-900">
                Imported {result.added} invoice{result.added === 1 ? '' : 's'}
                {result.duplicates > 0 && ` · skipped ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}`}
                {existingCount > 0 && ` · you now have ${existingCount} invoices total`}
              </p>
            </div>
            <button onClick={reset} className="text-xs font-medium text-emerald-700 underline hover:text-emerald-800">
              Clear
            </button>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertCircle className="h-4 w-4" />
                {result.errors.length} row issue{result.errors.length === 1 ? '' : 's'} (skipped):
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-800">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
                {result.errors.length > 20 && <li>… and {result.errors.length - 20} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
