"use client";

import {useMemo,useState} from "react";
import {ComparisonStateBadge,MoneyAmount} from "@miqo/ui";
import type {NormalisedQuoteVM} from "@miqo/application-contracts";
import styles from "./quotes.module.css";

export function MobileQuoteComparison({quotes}:{quotes:ReadonlyArray<NormalisedQuoteVM>}){
  const [selected,setSelected]=useState<ReadonlyArray<string>>([]);
  const selectedQuotes=useMemo(
    ()=>selected.map(id=>quotes.find(quote=>quote.normalisedQuoteId===id)).filter((quote):quote is NormalisedQuoteVM=>Boolean(quote)),
    [quotes,selected],
  );

  function toggle(id:string){
    setSelected(current=>{
      if(current.includes(id))return current.filter(item=>item!==id);
      if(current.length>=2)return [current[1],id];
      return [...current,id];
    });
  }

  return <div className={styles.mobileQuoteComparison} data-testid="mobile-quote-comparison">
    <div className={styles.mobileQuoteIntro}>
      <strong>Ranked quote cards</strong>
      <span>Select up to two results to compare their displayed pricing and excess dimensions.</span>
    </div>

    <div className={styles.mobileQuoteCards}>{quotes.map(quote=>{
      const checked=selected.includes(quote.normalisedQuoteId);
      return <article className={quote.ordinal===1?styles.mobileQuoteCard+" "+styles.mobileQuoteCardFirst:styles.mobileQuoteCard} key={quote.normalisedQuoteId}>
        <div className={styles.mobileQuoteCardHeader}>
          <div><span>Rank #{quote.ordinal}</span><strong>{quote.marketRoute.displayName}</strong><small>{quote.marketRoute.providerKey}</small></div>
          <ComparisonStateBadge state={quote.comparisonState}/>
        </div>
        <dl className={styles.mobileQuoteMetrics}>
          <div><dt>Annual premium</dt><dd><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></dd></div>
          <div><dt>Finance cost</dt><dd><MoneyAmount pence={quote.pricing.financeCostPence}/></dd></div>
          <div><dt>Total excess</dt><dd><MoneyAmount pence={quote.excess.totalExcessExposurePence}/></dd></div>
          <div><dt>Objective metric</dt><dd><MoneyAmount pence={quote.objectiveMetricValuePence}/></dd></div>
        </dl>
        <button
          type="button"
          className={checked?styles.mobileCompareButton+" "+styles.mobileCompareButtonSelected:styles.mobileCompareButton}
          aria-pressed={checked}
          aria-label={(checked?"Remove ":"Select ")+quote.marketRoute.displayName+(checked?" from":" for")+" comparison"}
          onClick={()=>toggle(quote.normalisedQuoteId)}
        >
          {checked?"Selected for comparison":"Select for comparison"}
        </button>
      </article>;
    })}</div>

    {selectedQuotes.length?<section className={styles.mobileCompareDrawer} aria-live="polite" aria-label="Selected quote comparison">
      <div className={styles.mobileCompareDrawerHeader}>
        <div><strong>{selectedQuotes.length===2?"Two-result comparison":"Select one more result"}</strong><span>{selectedQuotes.length}/2 selected</span></div>
        <button type="button" className={styles.mobileClearButton} onClick={()=>setSelected([])}>Clear</button>
      </div>
      <div className={styles.mobileCompareColumns}>{selectedQuotes.map(quote=><article key={quote.normalisedQuoteId}>
        <strong>{quote.marketRoute.displayName}</strong>
        <dl>
          <div><dt>Annual premium</dt><dd><MoneyAmount pence={quote.pricing.annualCashPremiumPence}/></dd></div>
          <div><dt>Finance cost</dt><dd><MoneyAmount pence={quote.pricing.financeCostPence}/></dd></div>
          <div><dt>Total excess</dt><dd><MoneyAmount pence={quote.excess.totalExcessExposurePence}/></dd></div>
        </dl>
      </article>)}</div>
    </section>:null}
  </div>;
}
