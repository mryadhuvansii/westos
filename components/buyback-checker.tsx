'use client';

import { useState } from 'react';

const criteria = [
  'My jeans are genuine Westos with an intact, readable serial code.',
  'My original purchase was within the last 180 days.',
  'The jeans and original order are linked to my Westos account.',
  'This pair has not been used in a previous buyback.',
  'I can hand over this pair when my new order is delivered.',
];

export default function BuybackChecker() {
  const [answers, setAnswers] = useState<boolean[]>(criteria.map(() => false));
  const [checked, setChecked] = useState(false);
  const matches = answers.every(Boolean);

  return <section className="buyback-checker" id="eligibility" aria-labelledby="eligibility-title">
    <div><p className="eyebrow">KNOW YOUR NEXT STEP</p><h2 id="eligibility-title">Could your pair<br />be the one?</h2><p>Start with this simple checklist. Once the program launches, your account, order and serial code will be checked before a buyback is approved.</p><span className="secondary-label">PROGRAM COMING SOON</span></div>
    <form className="buyback-checklist" onSubmit={(event) => { event.preventDefault(); setChecked(true); }}>
      <fieldset><legend>Your current pair</legend>{criteria.map((criterion, index) => <label key={criterion}><input type="checkbox" checked={answers[index]} onChange={(event) => { setAnswers(answers.map((answer, position) => position === index ? event.target.checked : answer)); setChecked(false); }} /><span>{criterion}</span></label>)}</fieldset>
      <button className="button" type="submit">Check the basics <span aria-hidden="true">→</span></button>
      {checked && <div className="buyback-check-result" role="status"><strong>{matches ? 'Your answers match the preliminary checklist.' : 'A few details still need to match.'}</strong><p>{matches ? 'This is not verified eligibility or a credit approval. Account, order, serial code and delivery handover verification will be required when the program launches.' : 'All five conditions are needed for a buyback. This preview cannot verify your jeans or approve credit; final checks will be available after launch.'}</p></div>}
    </form>
  </section>;
}
