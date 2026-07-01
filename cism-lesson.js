const THEME_KEY = 'cism-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('.theme-toggle').textContent = t === 'dark' ? '☀ Light' : '☾ Dark';
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');

  function gradeQuiz() {
    const questions = document.querySelectorAll('#quiz .q');
    let score = 0, answered = 0;
    questions.forEach(q => {
      const answer = q.dataset.answer;
      const opts = q.querySelectorAll('.opt');
      opts.forEach(o => o.classList.remove('correct', 'wrong'));
      const checked = q.querySelector('input:checked');
      if (checked) {
        answered++;
        const chosenLabel = checked.closest('.opt');
        if (checked.value === answer) { chosenLabel.classList.add('correct'); score++; }
        else {
          chosenLabel.classList.add('wrong');
          q.querySelector('input[value="' + answer + '"]').closest('.opt').classList.add('correct');
        }
      } else {
        q.querySelector('input[value="' + answer + '"]').closest('.opt').classList.add('correct');
      }
      q.querySelector('.rationale').classList.add('show');
    });
    const scoreEl = document.getElementById('score');
    scoreEl.innerHTML = 'Score: <span>' + score + ' / ' + questions.length + '</span>' +
      (answered < questions.length ? ' · (' + (questions.length - answered) + ' unanswered)' : '');
    document.getElementById('knowledge-check').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetQuiz() {
    document.getElementById('quiz').reset();
    document.querySelectorAll('#quiz .opt').forEach(o => o.classList.remove('correct', 'wrong'));
    document.querySelectorAll('#quiz .rationale').forEach(r => r.classList.remove('show'));
    document.getElementById('score').textContent = '';
  }

  // Flip cards (button elements => Enter/Space handled natively)
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => {
      const flipped = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    });
  });
