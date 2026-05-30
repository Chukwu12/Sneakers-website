// Getting all elements from the DOM
const imgContainer = document.querySelector('.showcase > div');
const img = document.querySelector('.showcase img');
const shadow = document.querySelector('.shadow');

const thumb = document.querySelectorAll('.thumbs img');
const titleOverlay = document.querySelector('.titleOverlay');
const title = document.querySelector('.titleText');
const desc = document.querySelector('.description');

const sizes = document.querySelectorAll('.sizes > li');
const stars = document.querySelectorAll('.stars span');
const price = document.querySelector('.price');
const colorBtn = document.querySelectorAll('.color');

const pag = document.querySelectorAll('.pag');
const prev = document.querySelector('.arr-left');
const next = document.querySelector('.arr-right');
const shoeNum = document.querySelector('.shoe-num');
const shoeTotal = document.querySelector('.shoe-total');
const pageBody = document.body;

if (pageBody) {
  window.requestAnimationFrame(() => {
    pageBody.classList.add('is-loaded');
  });
}

// Id Variables
let id = 1;
let colorType = 1;
let shoe = 1;

// Shoe Details / Data
const colors = [
  ['#ae001b', '#111111'],
  ['linear-gradient(0deg, orange, red)', '#bda08e'],
  [
    'linear-gradient(0deg, #00b8ea 0%, #e6882d 50%, #e56da6 100%)',
    'linear-gradient(0deg, #dae766, #b2afaa)'
  ]
];

const prices = ['150', '250', '175'];

const names = [
  ['Red Nike Jordan Max Aura 3', 'Black Nike Jordan Max Aura 3'],
  ['Black/Orange Nike Air Max 95', 'Beige/Gray Nike Air Max 95'],
  ['Colorful NIKE Jordan Delta 2 SP', 'Gray NIKE Jordan Delta 2 SP']
];

const descriptions = [
  ['Bring a piece of history to the city\'s urban streets as you walk into Nike Jordan Max Aura 3 men\'s sneakers. Inspired by the rich Jordanian heritage, this model has the energy of basketball shoes and a look that changes the perception of the classic style.'],
  ['Nike Air Max 95 men\'s sneakers move you with the strength and fluidity inspired by the anatomy of the human body. The central sole forms the basis of these sneakers, while the structured side panels give a solid and stable construction. Flexible incisions in the sole allow your feet to move naturally.'],
  ['Jordan Delta 2 SP men\'s basketball shoes offer a fresh and fearless approach to the characteristics you want: durability, comfort and the attitude of the Jordan brand. The first model of Delta 2 sneakers, with the same idea, received redesigned lines and modified components.']
];

const ratings = [4, 5, 3];

function getImage(imgType, currentShoe, currentColorType, currentId, extension) {
  return 'img/' + imgType + '/shoe' + currentShoe + '-' + currentColorType + '/img' + currentId + '.' + extension;
}

function resetActive(elements, elementClass, index) {
  for (let i = 0; i < elements.length; i++) {
    elements[i].classList.remove(elementClass + '-active');
  }
  elements[index].classList.add(elementClass + '-active');
}

function animate(element, time, anim) {
  if (!element) {
    return;
  }

  element.style.animation = anim;

  setTimeout(() => {
    element.style.animation = 'none';
  }, time);
}

function assignColors(index, currentShoe) {
  colorBtn[index].style.background = colors[currentShoe - 1][index];
}

function resetStars(currentShoeIndex) {
  for (let i = 0; i < stars.length; i++) {
    stars[i].innerText = 'star_outline';
  }

  for (let i = 0; i < ratings[currentShoeIndex]; i++) {
    stars[i].innerText = 'star';
  }
}

// Initialize product gallery only when all required nodes exist.
if (
  imgContainer &&
  img &&
  titleOverlay &&
  title &&
  desc &&
  price &&
  prev &&
  next &&
  shoeNum &&
  shoeTotal &&
  thumb.length > 0 &&
  sizes.length > 0 &&
  stars.length > 0 &&
  colorBtn.length > 0 &&
  pag.length > 0
) {
  for (let i = 0; i < sizes.length; i++) {
    sizes[i].addEventListener('click', () => {
      resetActive(sizes, 'size', i);
    });
  }

  shoeTotal.innerText = '0' + pag.length;
  shoeNum.innerText = '0' + shoe;
  price.innerText = '$' + prices[0];
  resetStars(shoe - 1);
  title.innerText = names[0][0];
  desc.innerText = descriptions[0];

  for (let i = 0; i < thumb.length; i++) {
    thumb[i].addEventListener('click', () => {
      id = i + 1;
      img.src = getImage('showcase', shoe, colorType, id, 'png');
      resetActive(thumb, 'thumb', i);
      animate(imgContainer, 550, 'fade 500ms ease-in-out');
    });
  }

  for (let i = 0; i < colorBtn.length; i++) {
    assignColors(i, shoe);

    colorBtn[i].addEventListener('click', () => {
      colorType = i + 1;

      setTimeout(() => {
        img.src = getImage('showcase', shoe, colorType, id, 'png');
      }, 450);

      for (let j = 0; j < thumb.length; j++) {
        thumb[j].src = getImage('thumbs', shoe, colorType, j + 1, 'jpg');
      }

      resetActive(colorBtn, 'color', i);
      title.innerText = names[shoe - 1][i];

      animate(img, 550, 'jump 500ms ease-in-out');
      animate(shadow, 550, 'shadow 500ms ease-in-out');
      animate(titleOverlay, 850, 'title 800ms ease');
    });
  }

  function slider(currentShoe) {
    setTimeout(() => {
      img.src = getImage('showcase', currentShoe, colorType, id, 'png');
    }, 600);

    for (let i = 0; i < thumb.length; i++) {
      thumb[i].src = getImage('thumbs', currentShoe, colorType, i + 1, 'jpg');
    }

    for (let i = 0; i < colorBtn.length; i++) {
      assignColors(i, currentShoe);
    }

    resetActive(pag, 'pag', currentShoe - 1);

    desc.innerText = descriptions[currentShoe - 1];
    title.innerText = names[currentShoe - 1][colorType - 1];
    price.innerText = '$' + prices[currentShoe - 1];
    resetStars(currentShoe - 1);
    shoeNum.innerText = '0' + currentShoe;

    animate(img, 1550, 'replace 1.5s ease-in');
    animate(shadow, 1550, 'shadow2 1.5s ease-in');
    animate(titleOverlay, 850, 'title 800ms ease');
  }

  const goPrev = () => {
    shoe--;
    if (shoe < 1) {
      shoe = pag.length;
    }
    slider(shoe);
  };

  const goNext = () => {
    shoe++;
    if (shoe > pag.length) {
      shoe = 1;
    }
    slider(shoe);
  };

  let touchStartX = 0;
  let touchEndX = 0;
  let lastSwipeAt = 0;

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const threshold = 45;

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    lastSwipeAt = Date.now();

    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }
  };

  prev.addEventListener('click', () => {
    goPrev();
  });

  next.addEventListener('click', () => {
    goNext();
  });

  for (let i = 0; i < pag.length; i++) {
    pag[i].addEventListener('click', () => {
      slider(i + 1);
      shoe = i + 1;
    });
  }

  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  const lightboxCloseTriggers = document.querySelectorAll('[data-lightbox-close]');

  const isTypingTarget = (target) => {
    if (!target) {
      return false;
    }

    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  };

  const openLightbox = () => {
    if (!lightbox || !lightboxImage || !img) {
      return;
    }

    if (Date.now() - lastSwipeAt < 350) {
      return;
    }

    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  };

  const closeLightbox = () => {
    if (!lightbox) {
      return;
    }

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  };

  img.addEventListener('click', openLightbox);
  img.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox();
    }
  });

  lightboxCloseTriggers.forEach((node) => {
    node.addEventListener('click', closeLightbox);
  });

  imgContainer.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });

  imgContainer.addEventListener('touchend', (event) => {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
      closeLightbox();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const lightboxOpen = lightbox && lightbox.classList.contains('is-open');
    if (lightboxOpen) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  });
}

/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.add('show-menu');
  });
}

if (navClose && navMenu) {
  navClose.addEventListener('click', () => {
    navMenu.classList.remove('show-menu');
  });
}

/*=============== ACTIVE NAV LINK ===============*/
const navLinks = document.querySelectorAll('.nav__link');

if (navLinks.length > 0) {
  const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

  navLinks.forEach((link) => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const normalizedHref = href === '' ? 'index.html' : href;
    const isActive = normalizedHref === currentPath;

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

const navLink = document.querySelectorAll('.nav__link');

const linkAction = () => {
  if (navMenu) {
    navMenu.classList.remove('show-menu');
  }
};

navLink.forEach((n) => n.addEventListener('click', linkAction));

/*=============== SWIPER SHOE ===============*/
if (typeof Swiper !== 'undefined' && document.querySelector('.banner__swiper')) {
  new Swiper('.banner__swiper', {
    loop: true,
    spaceBetween: 32,
    grabCursor: true,
    effect: 'creative',
    creativeEffect: {
      prev: {
        translate: [-100, 0, -500],
        opacity: 0
      },
      next: {
        translate: [-100, 0, -500],
        opacity: 0
      }
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    }
  });
}

/*=============== SHADOW HEADER ===============*/
const header = document.getElementById('header');

if (header) {
  const shadowHeader = () => {
    if (window.scrollY >= 50) {
      header.classList.add('scroll-header');
    } else {
      header.classList.remove('scroll-header');
    }
  };

  window.addEventListener('scroll', shadowHeader);
}

/*=============== COLLECTION FILTERS ===============*/
const filterChips = document.querySelectorAll('[data-filter]');
const collectionCards = document.querySelectorAll('.collection-grid .product-card');
const collectionCount = document.getElementById('collection-count');
const collectionEmpty = document.getElementById('collection-empty');

if (filterChips.length > 0 && collectionCards.length > 0) {
  const applyFilter = (filterValue) => {
    let visibleCount = 0;

    collectionCards.forEach((card) => {
      const categories = (card.getAttribute('data-category') || '').split(' ');
      const isVisible = filterValue === 'all' || categories.includes(filterValue);

      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) {
        visibleCount++;
      }
    });

    if (collectionCount) {
      const label = visibleCount === 1 ? 'Sneaker' : 'Sneakers';
      collectionCount.innerText = visibleCount + ' ' + label;
    }

    if (collectionEmpty) {
      collectionEmpty.hidden = visibleCount !== 0;
    }
  };

  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterValue = chip.getAttribute('data-filter') || 'all';

      filterChips.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });

      chip.classList.add('is-active');
      chip.setAttribute('aria-pressed', 'true');
      applyFilter(filterValue);
    });
  });

  applyFilter('all');
}
