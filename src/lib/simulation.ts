/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';

export type Frequency = 'monthly' | 'quarterly' | 'semi-annually' | 'annually';

export interface SimulationInputs {
  initialInvestment: number;
  pricePerShare: number;
  monthlySavings: number;
  dividendYield: number; // yearly %
  dividendGrowth: number; // yearly %
  capitalGrowth: number; // yearly %
  frequency: Frequency;
  years: number;
  dividendTax: number; // %
  allowFractionalShares: boolean;
  courtage: number;
  managementFee: number; // yearly %
  inflation: number; // yearly %
  showInflationAdjusted: boolean;
  savingsGrowth: number; // yearly %
}

export interface MonthResult {
  month: number;
  year: number;
  startValue: number;
  totalValue: number;
  investedCapital: number;
  grossDividend: number;
  dividendTaxAmount: number;
  netDividend: number;
  totalDividends: number; // accumulated net
  totalReinvestedDivs: number;
  totalGrowth: number;
  sharesBeforePurchase: number;
  newSharesFromSavings: number;
  newSharesFromReinvestment: number;
  shares: number;
  cashBalance: number;
  dividendPerShare: number;
  currentPrice: number;
  inflationAdjustedValue: number;
  monthlySavings: number;
}

export function calculateSimulation(inputs: SimulationInputs): MonthResult[] {
  const results: MonthResult[] = [];
  
  // Validation
  const years = Math.max(1, inputs.years);
  const totalMonths = years * 12;
  const priceStart = Math.max(0.01, inputs.pricePerShare);
  const initialInvest = Math.max(0, inputs.initialInvestment);
  const baseMonthlySavings = Math.max(0, inputs.monthlySavings);
  const savingsGrowth = Math.max(0, inputs.savingsGrowth / 100);
  const baseYield = Math.max(0, inputs.dividendYield / 100);
  const divGrowth = Math.max(0, inputs.dividendGrowth / 100);
  const capGrowth = Math.max(-1, inputs.capitalGrowth / 100);
  const taxRate = Math.max(0, inputs.dividendTax / 100);
  const mFee = Math.max(0, inputs.managementFee / 100);
  const inflation = Math.max(-1, inputs.inflation / 100);

  let currentPrice = priceStart;
  let shares = 0;
  let cashBalance = 0;
  let totalSavedMonthly = 0;
  let accumulatedNetDividends = 0;
  let totalReinvestedDivs = 0;
  
  // Initial purchase
  const initialBuyingPower = initialInvest - inputs.courtage;
  if (initialBuyingPower > 0) {
    const sharesToBuy = inputs.allowFractionalShares 
      ? initialBuyingPower / currentPrice 
      : Math.floor(initialBuyingPower / currentPrice);
    
    if (sharesToBuy > 0) {
      const cost = sharesToBuy * currentPrice;
      shares += sharesToBuy;
      cashBalance = (initialBuyingPower - cost);
    } else {
      cashBalance = initialInvest;
    }
  } else if (initialInvest > 0) {
    cashBalance = initialInvest;
  }

  results.push({
    month: 0,
    year: 0,
    startValue: 0,
    totalValue: shares * currentPrice + cashBalance,
    investedCapital: initialInvest,
    grossDividend: 0,
    dividendTaxAmount: 0,
    netDividend: 0,
    totalDividends: 0,
    totalReinvestedDivs: 0,
    totalGrowth: 0,
    sharesBeforePurchase: 0,
    newSharesFromSavings: shares,
    newSharesFromReinvestment: 0,
    shares,
    cashBalance,
    dividendPerShare: 0,
    currentPrice,
    inflationAdjustedValue: shares * currentPrice + cashBalance,
    monthlySavings: 0,
  });

  for (let m = 1; m <= totalMonths; m++) {
    const startValue = shares * currentPrice + cashBalance;
    const isDividendMonth = checkIsDividendMonth(m, inputs.frequency);
    const yearsPassedRaw = (m - 1) / 12;
    const currentYear = Math.floor(yearsPassedRaw);
    
    // 1. Value Growth (applied monthly)
    const monthlyGrowthRate = Math.pow(1 + capGrowth, 1 / 12) - 1;
    currentPrice *= (1 + monthlyGrowthRate);

    // 2. Fees (applied monthly) - reduces price/value
    const monthlyFeeRate = Math.pow(1 + mFee, 1 / 12) - 1;
    currentPrice *= (1 - monthlyFeeRate);

    const sharesBeforePurchase = shares;
    let newSharesFromSavings = 0;
    let newSharesFromReinvestment = 0;
    let grossDividend = 0;
    let dividendTaxAmount = 0;
    let netDividend = 0;

    // 3. Current Monthly Savings (increases yearly)
    const currentMonthlySavings = baseMonthlySavings * Math.pow(1 + savingsGrowth, currentYear);

    // 4. Monthly savings purchase
    cashBalance += currentMonthlySavings;
    totalSavedMonthly += currentMonthlySavings;

    if (cashBalance >= inputs.courtage) {
       const buyingPower = cashBalance - inputs.courtage;
       const toBuy = inputs.allowFractionalShares 
         ? buyingPower / currentPrice 
         : Math.floor(buyingPower / currentPrice);
       
       if (toBuy > 0) {
         const cost = toBuy * currentPrice;
         shares += toBuy;
         newSharesFromSavings = toBuy;
         cashBalance -= (cost + inputs.courtage);
       }
    }

    // 5. Calculate Dividends
    const currentYearYield = baseYield * Math.pow(1 + divGrowth, currentYear);
    
    if (isDividendMonth) {
      const divsPerYear = getDivsPerPeriod(inputs.frequency);
      const holdingsValue = shares * currentPrice;
      grossDividend = (holdingsValue * currentYearYield) / divsPerYear;
      dividendTaxAmount = grossDividend * taxRate;
      netDividend = grossDividend - dividendTaxAmount;
      
      accumulatedNetDividends += netDividend;
      cashBalance += netDividend;

      // Reinvest the dividend immediately (plus any previous cash balance)
      if (cashBalance >= inputs.courtage) {
        const buyingPower = cashBalance - inputs.courtage;
        const toBuy = inputs.allowFractionalShares 
          ? buyingPower / currentPrice 
          : Math.floor(buyingPower / currentPrice);
        
        if (toBuy > 0) {
          const cost = toBuy * currentPrice;
          shares += toBuy;
          newSharesFromReinvestment = toBuy;
          totalReinvestedDivs += cost;
          cashBalance -= (cost + inputs.courtage);
        }
      }
    }

    const totalValue = shares * currentPrice + cashBalance;
    const yearsToAdjust = m / 12;
    const inflationFactor = Math.pow(1 + inflation, yearsToAdjust);
    
    results.push({
      month: m,
      year: Math.floor(m / 12),
      startValue,
      totalValue,
      investedCapital: initialInvest + totalSavedMonthly,
      grossDividend,
      dividendTaxAmount,
      netDividend,
      totalDividends: accumulatedNetDividends,
      totalReinvestedDivs,
      totalGrowth: totalValue - (initialInvest + totalSavedMonthly),
      sharesBeforePurchase,
      newSharesFromSavings,
      newSharesFromReinvestment,
      shares,
      cashBalance,
      dividendPerShare: (currentPrice * currentYearYield),
      currentPrice,
      inflationAdjustedValue: totalValue / inflationFactor,
      monthlySavings: currentMonthlySavings,
    });
  }

  return results;
}

export function useSimulation(inputs: SimulationInputs) {
  return useMemo(() => calculateSimulation(inputs), [inputs]);
}

function checkIsDividendMonth(m: number, freq: Frequency): boolean {
  switch (freq) {
    case 'monthly': return true;
    case 'quarterly': return m % 3 === 0;
    case 'semi-annually': return m % 6 === 0;
    case 'annually': return m % 12 === 0;
    default: return false;
  }
}

function getDivsPerPeriod(freq: Frequency): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semi-annually': return 2;
    case 'annually': return 1;
    default: return 1;
  }
}
