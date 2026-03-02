(function () {
  'use strict';

  let selectedLanguage = null;

  const langButtons = document.querySelectorAll('#lang-buttons .lang-btn');
  const titleInput = document.getElementById('story-title');
  const bodyInput = document.getElementById('story-body');
  const submitBtn = document.getElementById('submit-btn');
  const progressArea = document.getElementById('progress-area');
  const stepProgress = document.getElementById('step-progress');
  const resultArea = document.getElementById('result-area');
  const resultLink = document.getElementById('result-link');

  // --- Language selection ---
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLanguage = btn.dataset.lang;
      langButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateSubmitState();
    });
  });

  // --- Enable/disable submit ---
  titleInput.addEventListener('input', updateSubmitState);
  bodyInput.addEventListener('input', updateSubmitState);

  function updateSubmitState() {
    submitBtn.disabled = !(selectedLanguage && titleInput.value.trim() && bodyInput.value.trim());
  }

  // --- Submit ---
  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    // Disable form
    submitBtn.disabled = true;
    titleInput.disabled = true;
    bodyInput.disabled = true;
    langButtons.forEach(b => (b.disabled = true));

    // Show progress
    progressArea.hidden = false;
    resultArea.hidden = true;
    stepProgress.innerHTML = '';

    // Preview step count from dividers
    const previewSteps = body.split(/^---$/m).map(s => s.trim()).filter(s => s.length > 0);
    previewSteps.forEach((_, i) => {
      const li = document.createElement('li');
      li.className = 'step-progress-item';
      li.dataset.step = i + 1;
      li.innerHTML = `<span class="step-label">Step ${i + 1}</span> <span class="step-status pending">⏳ Waiting…</span>`;
      stepProgress.appendChild(li);
    });

    try {
      const res = await fetch('/api/story/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage, title, body }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      // Mark all steps as "generating image"
      data.steps.forEach(step => {
        const li = stepProgress.querySelector(`[data-step="${step.stepNumber}"]`);
        if (li) {
          li.querySelector('.step-status').textContent = '🎨 Generating image…';
          li.querySelector('.step-status').className = 'step-status generating';
        }
      });

      // Poll image status for each step
      await Promise.all(data.steps.map(step => pollImageStatus(data.storyId, step)));

      // All done — show result
      progressArea.hidden = true;
      resultArea.hidden = false;
      resultLink.href = '/';
    } catch (err) {
      progressArea.hidden = true;
      alert('Error creating story: ' + err.message);
      // Re-enable form
      submitBtn.disabled = false;
      titleInput.disabled = false;
      bodyInput.disabled = false;
      langButtons.forEach(b => (b.disabled = false));
      updateSubmitState();
    }
  });

  // --- Poll image status for a single step ---
  async function pollImageStatus(storyId, step) {
    const filename = `step-${step.stepNumber}.png`;
    const li = stepProgress.querySelector(`[data-step="${step.stepNumber}"]`);
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(1500);
      try {
        const res = await fetch(`/api/story/${encodeURIComponent(storyId)}/image-status/${encodeURIComponent(filename)}`);
        if (!res.ok) continue;
        const { status } = await res.json();

        if (status === 'done') {
          if (li) {
            li.querySelector('.step-status').textContent = '✅ Done';
            li.querySelector('.step-status').className = 'step-status done';
          }
          return;
        }
        if (status === 'failed') {
          if (li) {
            li.querySelector('.step-status').textContent = '⚠️ Image failed';
            li.querySelector('.step-status').className = 'step-status failed';
          }
          return;
        }
      } catch {
        // network hiccup, retry
      }
    }

    // Timeout
    if (li) {
      li.querySelector('.step-status').textContent = '⏱️ Timed out';
      li.querySelector('.step-status').className = 'step-status failed';
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
