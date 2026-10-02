  (function(){
    const trigger = document.getElementById('teleportTrigger');
    const flash = document.getElementById('teleportFlash');
    const destination = document.getElementById('gatewaySection');
    const mainEl = document.getElementById('main');
    if(!trigger || !flash || !destination || !mainEl) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let busy = false;
    const HIGHLIGHT_MS = 1100; // how long the landing highlight glow stays on the heading

    function spawnRing(x, y){
      const r = document.createElement('div');
      r.className = 'portal-ring';
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      document.body.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
      setTimeout(() => r.remove(), 700);
    }

    function teleport(originEl){
      if(busy) return;
      busy = true;

      if(reducedMotion){
        destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
        destination.classList.add('teleport-landed');
        setTimeout(() => {
          destination.classList.remove('teleport-landed');
          busy = false;
        }, HIGHLIGHT_MS);
        return;
      }

      // Click point in viewport pixels — works the same on a narrow
      // phone screen or a wide desktop window, since the flash and the
      // ring are both fixed to the viewport, not to the content column.
      const rect = originEl.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const tx = (x / window.innerWidth * 100).toFixed(2) + '%';
      const ty = (y / window.innerHeight * 100).toFixed(2) + '%';
      flash.style.setProperty('--tx', tx);
      flash.style.setProperty('--ty', ty);

      spawnRing(x, y);
      mainEl.classList.add('warp-out');
      flash.classList.remove('collapse');
      flash.classList.add('expand');

      setTimeout(() => {
        // Pin the destination to the very top of the viewport, so after
        // the animation the Gateway section itself becomes the top of
        // the page rather than just appearing mid-screen.
        destination.scrollIntoView({ behavior: 'auto', block: 'start' });
        destination.classList.add('teleport-landed');

        mainEl.classList.remove('warp-out');
        mainEl.classList.add('warp-in');

        flash.classList.remove('expand');
        flash.classList.add('collapse');

        setTimeout(() => {
          flash.classList.remove('collapse');
          mainEl.classList.remove('warp-in');
        }, 420);

        // Let the landing highlight glow briefly, then settle — the view
        // stays put on the Gateway section instead of bouncing back up.
        setTimeout(() => {
          destination.classList.remove('teleport-landed');
          busy = false;
        }, HIGHLIGHT_MS);
      }, 380);
    }

    trigger.addEventListener('click', () => teleport(trigger));
    trigger.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        teleport(trigger);
      }
    });
  })();
