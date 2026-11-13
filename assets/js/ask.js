/* "Ask my CV": a small terminal. Built-in commands run here in the browser;
   anything else is a question, streamed back from the Worker in worker/ (Cloudflare Workers AI). */
(() => {
  const out = document.getElementById("termout");
  const form = document.getElementById("termform");
  const input = document.getElementById("termq");
  const chips = document.getElementById("termchips");
  if (!out || !form) return;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const history = [];        // the conversation sent to the AI
  const typed = []; let typedAt = 0; // input recall with ↑ / ↓
  let busy = false, controller = null;

  const SUGGESTIONS = [
    "What does Diogo do day to day?",
    "Which projects show Salesforce skills?",
    "Has he worked with automated testing?",
    "What is LevelUp?",
  ];

  /* the tiny Markdown subset the assistant is asked to use: links, bold, "- " bullets */
  function md(text){
    return esc(text)
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
      .replace(/^- /gm, "• ");
  }

  function print(html, cls = ""){
    const div = document.createElement("div");
    div.className = "tl " + cls;
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
    return div;
  }
  const echo = cmd => print(`<span class="tp">diogo@cv:~$</span> ${esc(cmd)}`, "cmd");

  const COMMANDS = {
    help(){
      print(`Ask anything about my work in plain words, or use a command:
  <b>whoami</b>          who I am, in one line
  <b>ls</b>              list my projects
  <b>open</b> &lt;project&gt;  open a project's repo (e.g. open ledger)
  <b>cat skills</b>      my skills by group
  <b>contact</b>         how to reach me
  <b>clear</b>           clear the screen and start a new conversation`);
    },
    whoami(){
      const now = CV.journey.find(m => m.current);
      print(`Diogo Santos · business analyst &amp; QA consultant, Lisbon.${now ? ` Currently ${esc(now.title)} at ${esc(now.org.split(" · ")[0])}.` : ""}`);
    },
    ls(){
      print(CV.projects.map(p => `<b>${esc(p.name.padEnd(16))}</b> ${esc(p.category)}`).join("\n") +
        `\n\nType <b>open &lt;name&gt;</b> to open one, or ask about it.`);
    },
    open(arg){
      const p = CV.projects.find(x => slug(x.name).startsWith(slug(arg || "")) && arg);
      if (!p) return print(`No project called "${esc(arg || "")}". Type <b>ls</b> to see them.`, "err");
      const url = p.demo || p.url;
      print(`Opening ${esc(p.name)}: <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`);
      window.open(url, "_blank", "noopener");
    },
    cat(arg){
      if (slug(arg || "") !== "skills") return print(`Try <b>cat skills</b>.`, "err");
      print(CV.skills.map(g => `<b>${esc(g.group)}</b>\n  ${g.items.map(s => `${esc(s.name)} ${"●".repeat(s.level)}${"○".repeat(5 - s.level)}`).join("\n  ")}`).join("\n"));
    },
    contact(){
      print(CV.contact.map(c => `${esc(c.label.padEnd(10))} ${c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.value)}</a>` : esc(c.value)}`).join("\n"));
    },
    clear(){
      if (controller) controller.abort();
      out.innerHTML = ""; history.length = 0;
      greet();
    },
    sudo(arg){
      if (/hire/i.test(arg || "")) { print("Permission granted. Taking you to the contact details…"); document.getElementById("contact").scrollIntoView({behavior:"smooth"}); }
      else print("Nice try.", "err");
    },
  };

  async function ask(question){
    if (!CV.askEndpoint){
      print(`AI answers aren't switched on yet, but the built-in commands work. Type <b>help</b>.`, "err");
      return;
    }
    history.push({ role: "user", content: question });
    const line = print('<span class="cursor"></span>', "ans");
    let text = "";
    busy = true; form.classList.add("busy");
    controller = new AbortController();
    try {
      const res = await fetch(CV.askEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body){
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `The assistant answered with an error (${res.status}).`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;){
        const { value, done } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        line.innerHTML = md(text) + '<span class="cursor"></span>';
        out.scrollTop = out.scrollHeight;
      }
      line.innerHTML = md(text.trim() || "(no answer)");
      history.push({ role: "assistant", content: text.trim() || "…" });
    } catch (e){
      history.pop(); // drop the unanswered question so the conversation stays valid
      if (e.name === "AbortError") { line.remove(); }
      else { line.className = "tl err"; line.textContent = navigator.onLine === false ? "You seem to be offline." : e.message; }
    } finally {
      busy = false; controller = null; form.classList.remove("busy");
      out.scrollTop = out.scrollHeight;
    }
  }

  function run(raw){
    const cmd = raw.trim();
    if (!cmd || busy) return;
    typed.push(cmd); typedAt = typed.length;
    echo(cmd);
    const [name, ...rest] = cmd.split(/\s+/);
    const fn = COMMANDS[name.toLowerCase()];
    if (fn && Object.hasOwn(COMMANDS, name.toLowerCase())) fn(rest.join(" "));
    else ask(cmd);
  }

  function greet(){
    print(`Mission control online. Ask about my experience and projects in plain words, or type <b>help</b>.${CV.askEndpoint ? `\n<span class="dimtxt">Answers are written by an AI model from this CV and my public GitHub repos. AI can get details wrong, so check the linked repos.</span>` : ""}`);
  }

  form.addEventListener("submit", e => { e.preventDefault(); const v = input.value; input.value = ""; run(v); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" && typedAt > 0){ input.value = typed[--typedAt]; e.preventDefault(); }
    if (e.key === "ArrowDown"){ typedAt = Math.min(typed.length, typedAt + 1); input.value = typed[typedAt] || ""; e.preventDefault(); }
    if (e.key === "c" && e.ctrlKey && busy && controller){ controller.abort(); e.preventDefault(); }
  });
  out.addEventListener("click", () => { if (!getSelection().toString()) input.focus({ preventScroll: true }); });
  chips.innerHTML = (CV.askEndpoint ? SUGGESTIONS : ["help", "ls", "cat skills", "whoami"])
    .map(s => `<button type="button" class="tchip">${esc(s)}</button>`).join("");
  chips.addEventListener("click", e => { const b = e.target.closest(".tchip"); if (b) run(b.textContent); });
  greet();
})();
