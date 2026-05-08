/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Info, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  PiggyBank, 
  Layers, 
  ArrowUpRight,
  Coins,
  PieChart as PieChartIcon,
  Table as TableIcon,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Frequency, SimulationInputs, useSimulation, MonthResult } from './lib/simulation';

// --- Constants & Types ---

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];

const DICTIONARY: Record<string, string> = {
  dividendYield: "Den årliga utdelningen som procent av innehavets värde.",
  da: "Direktavkastning (DA) är utdelningen dividerat med priset.",
  dividend: "En del av företagets vinst som betalas ut till ägarna.",
  grossDividend: "Utdelning innan skatt har dragits av.",
  netDividend: "Utdelning efter skatt, de pengar du faktiskt får.",
  reinvestment: "När du använder utdelningen för att köpa fler andelar.",
  dividendGrowth: "Hur mycket utdelningen förväntas öka varje år.",
  capitalGrowth: "Hur mycket själva tillgångens pris (t.ex. aktiepriset) ökar.",
  monthlySavings: "Ditt regelbundna sparande varje månad.",
  investedCapital: "De pengar du själv har satt in (initialt + månadssparande).",
  selfGrowth: "Värdeökning som kommit från utdelningar och kursuppgång.",
  fractionalShares: "Möjligheten att äga delar av en andel (t.ex. 0.5 aktier).",
  cashBalance: "Pengar som inte har kunnat investeras, till exempel om endast hela andelar får köpas.",
  inflationAdjusted: "Värdet visat i dagens penningvärde, rensat för prishöjningar i samhället.",
  courtage: "Avgift till banken för att genomföra ett köp.",
  managementFee: "Årlig avgift för att förvalta tillgången (t.ex. fondavgift).",
  savingsGrowth: "Hur mycket ditt månadssparande ökar varje år. Exempel: Om du sparar 1 000 kr/mån och anger 5 %, blir månadssparandet 1 050 kr/mån år 2.",
  
  // Result Cards Tooltips
  slutvarde: "Det totala värdet av portföljen vid simuleringens slut. Inkluderar värdet av alla andelar plus eventuellt kontantsaldo.",
  totalEgenTillvaxt: "Den del av slutvärdet som inte kommer från dina egna insättningar. Beräknas som slutvärde minus initial investering och totalt månadssparande.",
  initialInvestering: "Beloppet du investerade från början.",
  totaltManadssparande: "Summan av alla månadsinsättningar du har gjort under hela perioden.",
  aterinvesteradNettoDA: "Den totala utdelningen efter skatt som har återinvesterats i nya andelar. DA betyder direktavkastning.",
  totalUtdelningBrutto: "Den totala utdelningen före eventuell skatt.",
  slutligVinstAndel: "Andelen av slutvärdet som består av egen tillväxt, alltså värde som skapats av utdelningar, återinvesteringar och värdetillväxt.",
  slutligtMarknadsvarde: "Värdet av alla andelar vid simuleringens slut, exklusive kontantsaldo.",
  slutligtPrisPerAndel: "Det beräknade priset per andel vid simuleringens slut.",
  totalSkatt: "Den totala skatt som dragits från utdelningarna innan återinvestering.",
};

// --- Components ---

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1 align-top">
    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
    <div className="invisible group-hover:visible absolute z-[100] w-64 p-3 bg-slate-900 text-white text-xs leading-relaxed rounded-xl shadow-2xl -left-32 bottom-full mb-3 pointer-events-none transition-all opacity-0 group-hover:opacity-100 border border-slate-700">
      {text}
      <div className="absolute top-full left-1/2 -ml-1.5 border-[6px] border-transparent border-t-slate-900" />
    </div>
  </div>
);

const InputField = ({ 
  label, 
  tooltipKey, 
  value, 
  onChange, 
  type = "number", 
  suffix,
  min = 0,
  step = 1
}: { 
  label: string; 
  tooltipKey: string; 
  value: number; 
  onChange: (val: number) => void;
  type?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
      {label} <Tooltip text={DICTIONARY[tooltipKey] || ""} />
    </label>
    <div className="relative">
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const ToggleField = ({ 
  label, 
  tooltipKey, 
  value, 
  onChange 
}: { 
  label: string; 
  tooltipKey: string; 
  value: boolean; 
  onChange: (val: boolean) => void; 
}) => (
  <div className="flex items-center justify-between py-2">
    <label className="text-sm font-medium text-slate-700 flex items-center">
      {label} <Tooltip text={DICTIONARY[tooltipKey] || ""} />
    </label>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${value ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
);

const ResultCard = ({ title, value, icon: Icon, color = "indigo", tooltipKey }: { title: string; value: string; icon: any; color?: string; tooltipKey?: string }) => {
  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-50 text-slate-600",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 h-full hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.indigo}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
          {title} {tooltipKey && <Tooltip text={DICTIONARY[tooltipKey] || ""} />}
        </span>
        <span className="text-xl font-extrabold text-slate-900 mt-0.5 truncate">{value}</span>
      </div>
    </div>
  );
};

const SimulationTableYear = ({ year, months, formatCurrency }: { year: number; months: MonthResult[]; formatCurrency: (v: number) => string; key?: any }) => {
  const [isOpen, setIsOpen] = useState(year === 0);

  const stats = useMemo(() => {
    const yearMonths = months.filter(m => m.year === year && m.month > 0);
    if (yearMonths.length === 0) return null;
    return {
      start: yearMonths[0].startValue,
      end: yearMonths[yearMonths.length - 1].totalValue,
      divs: yearMonths.reduce((acc, m) => acc + m.netDividend, 0),
      savings: yearMonths.reduce((acc, m) => acc + m.monthlySavings, 0),
      reinvest: yearMonths.reduce((acc, m) => acc + m.newSharesFromReinvestment * m.currentPrice, 0),
      growth: yearMonths[yearMonths.length - 1].totalValue - yearMonths[0].startValue - yearMonths.reduce((acc, m) => acc + m.monthlySavings, 0)
    };
  }, [months, year]);

  if (!stats && year !== 0) return null;

  return (
    <div className="border-b border-slate-100">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            {year}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            {year === 0 ? (
              <span className="col-span-full text-slate-900">Startinvestering</span>
            ) : (
              <>
                <div className="flex flex-col"><span className="text-slate-300">Start</span><span className="text-slate-700">{formatCurrency(stats!.start)}</span></div>
                <div className="flex flex-col"><span className="text-slate-300">Slut</span><span className="text-indigo-600 font-black">{formatCurrency(stats!.end)}</span></div>
                <div className="flex flex-col"><span className="text-amber-500">Utdelning</span><span className="text-amber-600">+{formatCurrency(stats!.divs)}</span></div>
                <div className="flex flex-col"><span className="text-emerald-500">Sparat</span><span className="text-emerald-700">+{formatCurrency(stats!.savings)}</span></div>
                <div className="flex flex-col"><span className="text-indigo-400">Återinv.</span><span className="text-indigo-600">+{formatCurrency(stats!.reinvest)}</span></div>
                <div className="flex flex-col"><span className="text-blue-400">Värdeökn.</span><span className="text-blue-600">{formatCurrency(stats!.growth)}</span></div>
              </>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-x-auto bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200"
          >
            <div className="min-w-[1200px]">
              <table className="w-full text-[11px] text-left border-collapse">
              <thead className="text-slate-400 uppercase tracking-wider font-bold border-y border-slate-100">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Period</th>
                  <th className="px-4 py-3">Startvärde</th>
                  <th className="px-4 py-3">Pris/Andel</th>
                  <th className="px-4 py-3">Andelar (före)</th>
                  <th className="px-4 py-3 text-emerald-600">Sparande</th>
                  <th className="px-4 py-3">Nya (Spar)</th>
                  <th className="px-4 py-3">Brutto DA</th>
                  <th className="px-4 py-3 text-rose-500">Skatt</th>
                  <th className="px-4 py-3">Netto DA</th>
                  <th className="px-4 py-3">Summa Reinv.</th>
                  <th className="px-4 py-3">Nya (Reinv)</th>
                  <th className="px-4 py-3 font-bold">Totalt antal</th>
                  <th className="px-4 py-3 text-indigo-400">Kontant</th>
                  <th className="px-4 py-3">Totalt Insatt</th>
                  <th className="px-4 py-3">Återinv. ack.</th>
                  <th className="px-4 py-3 font-bold text-indigo-600">Totalvärde</th>
                  <th className="px-4 py-3 text-emerald-600">Egen tillväxt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.filter(m => m.year === year).map(m => (
                  <tr key={m.month} className="hover:bg-white transition-colors group">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-inherit z-10 border-r border-slate-100 group-hover:bg-white">
                      {m.month === 0 ? "Initialt" : `År ${m.year}, Mån ${((m.month - 1) % 12) + 1}`}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatCurrency(m.startValue)}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{m.currentPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{m.sharesBeforePurchase.toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">+{formatCurrency(m.monthlySavings)}</td>
                    <td className="px-4 py-3 text-emerald-600 text-[10px]">{m.newSharesFromSavings.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatCurrency(m.grossDividend)}</td>
                    <td className="px-4 py-3 text-rose-400">-{formatCurrency(m.dividendTaxAmount)}</td>
                    <td className="px-4 py-3 text-amber-600 font-bold">{formatCurrency(m.netDividend)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatCurrency(m.netDividend)}</td>
                    <td className="px-4 py-3 text-indigo-600 text-[10px]">{m.newSharesFromReinvestment.toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{m.shares.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-400 italic">{formatCurrency(m.cashBalance)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatCurrency(m.investedCapital)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatCurrency(m.totalReinvestedDivs)}</td>
                    <td className="px-4 py-3 font-black text-indigo-600">{formatCurrency(m.totalValue)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(m.totalGrowth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [inputs, setInputs] = useState<SimulationInputs>({
    initialInvestment: 10000,
    pricePerShare: 100,
    monthlySavings: 1000,
    dividendYield: 4,
    dividendGrowth: 3,
    capitalGrowth: 5,
    frequency: 'quarterly',
    years: 20,
    dividendTax: 0,
    allowFractionalShares: true,
    courtage: 0,
    managementFee: 0,
    inflation: 2,
    showInflationAdjusted: false,
    savingsGrowth: 0,
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const results = useSimulation(inputs);
  const lastResult = results[results.length - 1];

  // Logic check variables
  const slutvardeNominal = lastResult.totalValue;
  const totalEgenTillvaxtNominal = lastResult.totalGrowth;
  const totaltInsattKapital = lastResult.investedCapital;

  if (totalEgenTillvaxtNominal > slutvardeNominal && totaltInsattKapital > 0) {
    console.warn("Fel: egen tillväxt kan inte vara större än slutvärde.");
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) => 
    new Intl.NumberFormat('sv-SE', { style: 'percent', minimumFractionDigits: 1 }).format(val / 100);

  const lineChartData = useMemo(() => {
    return results.filter((_, i) => i % 6 === 0 || i === results.length - 1).map(r => ({
      year: r.year,
      "Totalvärde": Math.round(r.totalValue),
      "Insatt kapital": Math.round(r.investedCapital),
      "Egen tillväxt": Math.round(r.totalGrowth),
      "Inflationsjusterat": Math.round(r.inflationAdjustedValue),
    }));
  }, [results]);

  const pieData = [
    { name: 'Initial investering', value: inputs.initialInvestment },
    { name: 'Totalt månadssparande', value: lastResult.investedCapital - inputs.initialInvestment },
    { name: 'Egen tillväxt', value: lastResult.totalGrowth },
  ];

  const totalReturnPercent = ((lastResult.totalValue - lastResult.investedCapital) / lastResult.investedCapital) * 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 mb-20">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-full"
            >
              <TrendingUp className="w-3 h-3" /> Förmögenhetsbyggare
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              Ränta-på-ränta <span className="text-indigo-600 italic">Simulator</span>
            </h1>
            <p className="text-slate-500 max-w-2xl text-lg font-medium">
              Väx ditt kapital med kraften av återinvesterade utdelningar.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Inputs Column */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" /> Variabler
                </h2>
                <div className="p-1 px-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">Realtid</div>
              </div>

              <InputField
                label="Initial investering"
                tooltipKey="investedCapital"
                value={inputs.initialInvestment}
                onChange={(val) => setInputs({ ...inputs, initialInvestment: val })}
                suffix="kr"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Månadssparande"
                  tooltipKey="monthlySavings"
                  value={inputs.monthlySavings}
                  onChange={(val) => setInputs({ ...inputs, monthlySavings: val })}
                  suffix="kr"
                />
                <InputField
                  label="Årlig ökning (spar)"
                  tooltipKey="savingsGrowth"
                  value={inputs.savingsGrowth}
                  onChange={(val) => setInputs({ ...inputs, savingsGrowth: val })}
                  suffix="%"
                  step={0.1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Direktavkastning"
                  tooltipKey="dividendYield"
                  value={inputs.dividendYield}
                  onChange={(val) => setInputs({ ...inputs, dividendYield: val })}
                  suffix="%"
                  step={0.1}
                />
                <InputField
                  label="Utdelningstillväxt"
                  tooltipKey="dividendGrowth"
                  value={inputs.dividendGrowth}
                  onChange={(val) => setInputs({ ...inputs, dividendGrowth: val })}
                  suffix="%"
                  step={0.1}
                />
              </div>

              <InputField
                label="Värdetillväxt"
                tooltipKey="capitalGrowth"
                value={inputs.capitalGrowth}
                onChange={(val) => setInputs({ ...inputs, capitalGrowth: val })}
                suffix="%"
                step={0.1}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center">
                  Utdelningsfrekvens <Tooltip text="Hur ofta utdelningen betalas ut." />
                </label>
                <select
                  value={inputs.frequency}
                  onChange={(e) => setInputs({ ...inputs, frequency: e.target.value as Frequency })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                >
                  <option value="monthly">Månadsvis</option>
                  <option value="quarterly">Kvartalsvis</option>
                  <option value="semi-annually">Halvårsvis</option>
                  <option value="annually">Årsvis</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Spartid"
                  tooltipKey="years"
                  value={inputs.years}
                  onChange={(val) => setInputs({ ...inputs, years: val })}
                  suffix="år"
                />
                <InputField
                  label="Skatt på utdelning"
                  tooltipKey="netDividend"
                  value={inputs.dividendTax}
                  onChange={(val) => setInputs({ ...inputs, dividendTax: val })}
                  suffix="%"
                />
              </div>

              <ToggleField
                label="Tillåt decimalandelar"
                tooltipKey="fractionalShares"
                value={inputs.allowFractionalShares}
                onChange={(val) => setInputs({ ...inputs, allowFractionalShares: val })}
              />

              {/* Advanced Settings */}
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center justify-between w-full py-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  Avancerade inställningar
                  {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <AnimatePresence>
                  {advancedOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-4"
                    >
                      <InputField
                        label="Pris vid start"
                        tooltipKey="capitalGrowth"
                        value={inputs.pricePerShare}
                        onChange={(val) => setInputs({ ...inputs, pricePerShare: val })}
                        suffix="kr"
                        step={0.1}
                      />
                      <InputField
                        label="Courtage per köp"
                        tooltipKey="courtage"
                        value={inputs.courtage}
                        onChange={(val) => setInputs({ ...inputs, courtage: val })}
                        suffix="kr"
                      />
                      <InputField
                        label="Årlig fondavgift"
                        tooltipKey="managementFee"
                        value={inputs.managementFee}
                        onChange={(val) => setInputs({ ...inputs, managementFee: val })}
                        suffix="%"
                        step={0.01}
                      />
                      <InputField
                        label="Inflation"
                        tooltipKey="inflationAdjusted"
                        value={inputs.inflation}
                        onChange={(val) => setInputs({ ...inputs, inflation: val })}
                        suffix="%"
                        step={0.1}
                      />
                      <ToggleField
                        label="Visa inflationsjusterat"
                        tooltipKey="inflationAdjusted"
                        value={inputs.showInflationAdjusted}
                        onChange={(val) => setInputs({ ...inputs, showInflationAdjusted: val })}
                      />
                    </motion.div>
                   )}
                </AnimatePresence>
              </div>
            </div>

            {/* Beginner Quick Guide */}
            <div className="bg-indigo-600 p-6 rounded-3xl text-white space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4" /> Visste du?
              </h3>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                  <span className="font-bold block mb-1">Egen tillväxt</span>
                  Detta är pengar som "skapat sig själva". Det inkluderar värdeökning på dina andelar samt alla utdelningar du fått och återinvesterat.
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                  <span className="font-bold block mb-1">Hävstången i utdelningar</span>
                  Ju fler andelar du äger, desto mer utdelning får du nästa gång. Det är detta som kallas för ränta-på-ränta effekten.
                </div>
              </div>
              <p className="text-[10px] text-indigo-100 leading-relaxed italic opacity-80">
                Simulatorn visar hur även små månadssparanden kan bli stora summor över decennier.
              </p>
            </div>
          </aside>

          {/* Results Column */}
          <main className="lg:col-span-8 space-y-10">
            
            {/* Top Summaries Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <TableIcon className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Översikt</h2>
              </div>
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                <div className="xl:col-span-2">
                  <ResultCard 
                    title="Slutvärde" 
                    value={formatCurrency(lastResult.totalValue)} 
                    icon={Wallet} 
                    color="indigo" 
                    tooltipKey="slutvarde"
                  />
                </div>
                <div className="xl:col-span-2">
                  <ResultCard 
                    title="Total egen tillväxt" 
                    value={formatCurrency(lastResult.totalGrowth)} 
                    icon={TrendingUp} 
                    color="purple" 
                    tooltipKey="totalEgenTillvaxt"
                  />
                </div>
                {inputs.showInflationAdjusted && (
                  <div className="xl:col-span-4">
                    <ResultCard 
                      title="Inflationsjusterat Slutvärde" 
                      value={formatCurrency(lastResult.inflationAdjustedValue)} 
                      icon={Wallet} 
                      color="amber" 
                      tooltipKey="inflationAdjusted"
                    />
                  </div>
                )}
                <ResultCard 
                  title="Initial Investering" 
                  value={formatCurrency(inputs.initialInvestment)} 
                  icon={ArrowRight} 
                  color="slate" 
                  tooltipKey="initialInvestering"
                />
                <ResultCard 
                  title="Totalt månadssparande" 
                  value={formatCurrency(lastResult.investedCapital - inputs.initialInvestment)} 
                  icon={PiggyBank} 
                  color="emerald" 
                  tooltipKey="totaltManadssparande"
                />
                <ResultCard 
                  title="Återinvesterad Netto-DA" 
                  value={formatCurrency(lastResult.totalDividends)} 
                  icon={Coins} 
                  color="amber" 
                  tooltipKey="aterinvesteradNettoDA"
                />
                <ResultCard 
                  title="Total utdelning (Brutto)" 
                  value={formatCurrency(inputs.dividendTax < 100 ? lastResult.totalDividends / (1 - (inputs.dividendTax / 100)) : lastResult.totalDividends)} 
                  icon={Coins} 
                  color="blue" 
                  tooltipKey="totalUtdelningBrutto"
                />
                <ResultCard 
                  title="Slutlig vinst-andel" 
                  value={`${((lastResult.totalGrowth / lastResult.totalValue) * 100).toFixed(1)}%`} 
                  icon={PieChartIcon} 
                  color="rose" 
                  tooltipKey="slutligVinstAndel"
                />
                <ResultCard 
                   title="Slutligt Marknadsvärde" 
                   value={formatCurrency(lastResult.shares * lastResult.currentPrice)} 
                   icon={Layers} 
                   color="indigo" 
                   tooltipKey="slutligtMarknadsvarde"
                 />
                 <ResultCard 
                   title="Slutligt Pris per andel" 
                   value={formatCurrency(lastResult.currentPrice)} 
                   icon={TrendingUp} 
                   color="slate" 
                   tooltipKey="slutligtPrisPerAndel"
                 />
                 <ResultCard 
                   title="Kontantsaldo" 
                   value={formatCurrency(lastResult.cashBalance)} 
                   icon={Wallet} 
                   color="slate" 
                   tooltipKey="kontantsaldo"
                 />
                 <ResultCard 
                   title="Total Skatt" 
                   value={formatCurrency(inputs.dividendTax < 100 ? (lastResult.totalDividends / (1 - (inputs.dividendTax / 100))) - lastResult.totalDividends : 0)} 
                   icon={ArrowUpRight} 
                   color="rose" 
                   tooltipKey="totalSkatt"
                 />
              </motion.div>
            </div>

            {/* Graphs Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 px-1">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold">Analys & Grafer</h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Line Chart */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full"
                >
                  <div className="mb-6">
                    <h3 className="font-bold flex items-center gap-2">Värdeutveckling</h3>
                    <p className="text-xs text-slate-400 font-medium">Hur ditt kapital delas mellan insatser och vinst.</p>
                  </div>
                  <div className="h-[300px] w-full grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lineChartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="year" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 10}}
                          interval={Math.ceil(inputs.years / 6)}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 10}}
                          tickFormatter={(value) => `${(value / 1000).toLocaleString()}`}
                        />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          formatter={(value: any) => [formatCurrency(value), '']}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Area type="monotone" dataKey="Totalvärde" stroke="#6366f1" strokeWidth={3} fill="url(#colorTotal)" />
                        <Area type="monotone" dataKey="Insatt kapital" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                        <Area type="monotone" dataKey="Egen tillväxt" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
                        {inputs.showInflationAdjusted && <Area type="monotone" dataKey="Inflationsjusterat" stroke="#f59e0b" strokeWidth={2} fill="transparent" />}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Pie Chart */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full"
                >
                  <div className="mb-6">
                    <h3 className="font-bold flex items-center gap-2">Sammansättning av slutvärdet</h3>
                    <p className="text-xs text-slate-400 font-medium">Vilken del av pengarna kommer från dig själv?</p>
                  </div>
                  <div className="h-[300px] w-full grow flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-3 gap-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase truncate w-full text-center">{d.name}</span>
                        <span className="text-xs font-black text-slate-700">{((d.value / lastResult.totalValue) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Simulation Table */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold">Detaljerad Historik</h2>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Grupperat per år</div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {Array.from({ length: inputs.years + 1 }).map((_, i) => (
                  <SimulationTableYear 
                    key={i} 
                    year={i} 
                    months={results} 
                    formatCurrency={formatCurrency} 
                  />
                ))}
              </div>
            </div>

            {/* Additional Detailed Stats Card */}
            <div className="bg-slate-900 p-8 rounded-[40px] text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <PieChartIcon className="w-48 h-48 rotate-12" />
              </div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm">1</span> 
                    Var kommer pengarna ifrån?
                  </h3>
                  <div className="space-y-5">
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Dina egna insatser</span>
                        <span className="text-lg font-bold">{formatCurrency(lastResult.investedCapital)}</span>
                      </div>
                      <span className="text-indigo-400 font-black text-2xl">{((lastResult.investedCapital / lastResult.totalValue) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tillväxt & Utdelning</span>
                        <span className="text-lg font-bold">{formatCurrency(lastResult.totalGrowth)}</span>
                      </div>
                      <span className="text-emerald-400 font-black text-2xl">{((lastResult.totalGrowth / lastResult.totalValue) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm">2</span> 
                    Utdelningens kraft
                  </h3>
                  <div className="space-y-5">
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total bruttoutdelning</span>
                        <span className="text-lg font-bold">{formatCurrency(inputs.dividendTax < 100 ? lastResult.totalDividends / (1 - (inputs.dividendTax / 100)) : lastResult.totalDividends)}</span>
                      </div>
                      <span className="text-amber-400 font-black">Brutto</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Värdet på sista utdelningen</span>
                        <span className="text-lg font-bold">{formatCurrency(lastResult.dividendPerShare * lastResult.shares)} / år</span>
                      </div>
                      <span className="text-indigo-400 font-black text-lg">Målet</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                <p className="text-sm font-medium text-slate-300">
                  ⚠️ Vid slutet av perioden utgör den egna tillväxten 
                  <span className="text-emerald-400 font-black mx-1">{((lastResult.totalGrowth / lastResult.totalValue) * 100).toFixed(1)}%</span> 
                  av ditt totala kapital förutsatt att variablerna håller.
                </p>
              </div>
            </div>

          </main>
        </div>

        {/* Footer info */}
        <footer className="mt-20 pt-10 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 opacity-60 hover:opacity-100 transition-opacity">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Om simulatorn</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Denna applikation är byggd för att visualisera hur ränta-på-ränta effekten fungerar i teorin. 
                Genom att kombinera kursuppgång (värdetillväxt) med utdelningar som återinvesteras kan en 
                investering växa exponentiellt över tid.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Viktig information</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Detta är en förenklad modell. I verkligheten varierar utdelningar, skatteregler och marknadens 
                svängningar kraftigt. Inflationsjustering är en uppskattning och courtage beräknas per köptillfälle. 
                Använd aldrig en simulator som enda grund för dina investeringsbeslut.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Byggd med ❤️ för svenska sparare
          </div>
        </footer>
      </div>
    </div>
  );
}
