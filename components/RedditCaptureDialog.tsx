"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type ManualOpportunityInput = {
  url: string;
  title: string;
  body: string;
  pain: string;
  intent: string;
  author: string;
};

export default function RedditCaptureDialog({ busy, onClose, onSave }: {
  busy: boolean;
  onClose: () => void;
  onSave: (input: ManualOpportunityInput) => Promise<boolean>;
}) {
  const [input, setInput] = useState<ManualOpportunityInput>({ url: "", title: "", body: "", pain: "", intent: "Medium", author: "" });

  return <div className="modal-backdrop" onClick={onClose}>
    <form className="dialog capture-dialog" role="dialog" aria-modal="true" aria-label="Save Reddit conversation" onClick={event => event.stopPropagation()} onSubmit={async event => { event.preventDefault(); await onSave(input); }}>
      <button className="drawer-close" type="button" onClick={onClose} aria-label="Close"><X size={20}/></button>
      <div className="section-kicker">BRING YOUR OWN SIGNAL</div>
      <h2>Save a Reddit conversation</h2>
      <p>Paste a post link and write a short summary in your own words. Threadly will keep the source attached to your draft and follow-up.</p>
      <label>REDDIT POST LINK<input type="url" required value={input.url} placeholder="https://www.reddit.com/r/.../comments/.../" onChange={event => setInput({ ...input, url: event.target.value })}/></label>
      <label>YOUR SHORT TITLE<input required maxLength={200} value={input.title} placeholder="What question is this person asking?" onChange={event => setInput({ ...input, title: event.target.value })}/></label>
      <label>YOUR SUMMARY<textarea required maxLength={2000} value={input.body} placeholder="What is the problem, and why might you have something useful to add?" onChange={event => setInput({ ...input, body: event.target.value })}/></label>
      <div className="dialog-grid"><label>PAIN POINT (OPTIONAL)<input maxLength={120} value={input.pain} onChange={event => setInput({ ...input, pain: event.target.value })}/></label><label>INTENT<select value={input.intent} onChange={event => setInput({ ...input, intent: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label></div>
      <label>AUTHOR (OPTIONAL)<input maxLength={80} value={input.author} placeholder="Reddit username" onChange={event => setInput({ ...input, author: event.target.value })}/></label>
      <button className="btn btn-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save to Radar"}</button>
      <small>This saves your notes and the link. It does not fetch Reddit content or connect to Reddit.</small>
    </form>
  </div>;
}
