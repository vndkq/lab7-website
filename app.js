'use strict';

function mergeSort(items, compare) {
  const sorted = items.slice();
  const buffer = new Array(items.length);

  function sortRange(start, end) {
    if (end - start < 2) return;

    const middle = start + Math.floor((end - start) / 2);
    sortRange(start, middle);
    sortRange(middle, end);

    let left = start;
    let right = middle;
    for (let index = start; index < end; index++) {
      if (left < middle && (right === end || compare(sorted[left], sorted[right]) <= 0)) {
        buffer[index] = sorted[left++];
      } else {
        buffer[index] = sorted[right++];
      }
    }

    for (let index = start; index < end; index++) sorted[index] = buffer[index];
  }

  sortRange(0, sorted.length);
  return sorted;
}

function insertionSort(items, compare) {
  const sorted = items.slice();

  for (let index = 1; index < sorted.length; index++) {
    const item = sorted[index];
    let position = index;
    while (position > 0 && compare(sorted[position - 1], item) > 0) {
      sorted[position] = sorted[position - 1];
      position--;
    }
    sorted[position] = item;
  }

  return sorted;
}

const gallery = document.querySelector('#gallery');
const sortStatus = document.querySelector('#sort-status');
const sortButtons = [...document.querySelectorAll('[data-sort]')];
const photoRecords = [...gallery.children].map(card => ({
  card,
  title: card.querySelector('h3').textContent,
  date: Date.parse(card.querySelector('time').dateTime),
}));
const titleCollator = new Intl.Collator('ko', { numeric: true });
const compareNewest = (a, b) => b.date - a.date;
const compareBy = {
  recent: compareNewest,
  title: (a, b) => titleCollator.compare(a.title, b.title),
};

function sortGallery(mode) {
  const sorted = mergeSort(photoRecords, compareBy[mode]);
  gallery.replaceChildren(...sorted.map(record => record.card));
}

sortGallery('recent');
for (const button of sortButtons) {
  button.addEventListener('click', () => {
    sortGallery(button.dataset.sort);
    for (const option of sortButtons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    sortStatus.textContent = `${button.textContent}으로 정렬했습니다.`;
  });
}

const sampleSize = document.querySelector('#sample-size');
const runButton = document.querySelector('#run-benchmark');
const benchmarkResult = document.querySelector('#benchmark-result');
const benchmarkStatus = document.querySelector('#benchmark-status');
const countFormat = new Intl.NumberFormat('ko-KR');
const timeFormat = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const benchmarkAlgorithms = [
  { sort: mergeSort, time: document.querySelector('#merge-time'), count: document.querySelector('#merge-comparisons') },
  { sort: insertionSort, time: document.querySelector('#insertion-time'), count: document.querySelector('#insertion-comparisons') },
];

function makeSample(size) {
  let state = 7;
  return Array.from({ length: size }, (_, index) => {
    // A fixed seed keeps the input identical between runs at the same size.
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const template = photoRecords[index % photoRecords.length];
    return { title: template.title, date: template.date - (state % 4096) * 86400000 };
  });
}

async function measureSorts(records) {
  const timings = benchmarkAlgorithms.map(() => []);
  const warmup = records.slice(0, 250);
  for (const { sort } of benchmarkAlgorithms) sort(warmup, compareNewest);

  for (let run = 0; run < 5; run++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    // Alternate which algorithm runs first to reduce order effects.
    for (let offset = 0; offset < benchmarkAlgorithms.length; offset++) {
      const index = (run + offset) % benchmarkAlgorithms.length;
      const start = performance.now();
      benchmarkAlgorithms[index].sort(records, compareNewest);
      timings[index].push(performance.now() - start);
    }
  }

  benchmarkAlgorithms.forEach(({ sort, time, count }, index) => {
    let comparisons = 0;
    sort(records, (a, b) => {
      comparisons++;
      return compareNewest(a, b);
    });
    const median = timings[index].sort((a, b) => a - b)[2];
    time.textContent = median < 0.01 ? '0.01 ms 미만' : `${timeFormat.format(median)} ms`;
    count.textContent = countFormat.format(comparisons);
  });
}

sampleSize.addEventListener('change', () => {
  benchmarkResult.hidden = true;
  benchmarkStatus.textContent = '';
});

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  sampleSize.disabled = true;
  benchmarkResult.hidden = true;
  benchmarkStatus.textContent = '정렬 시간을 측정하는 중입니다.';

  try {
    const size = Number(sampleSize.value);
    await measureSorts(makeSample(size));
    benchmarkResult.hidden = false;
    benchmarkStatus.textContent = `${countFormat.format(size)}개 기록의 정렬을 비교했습니다.`;
  } finally {
    runButton.disabled = false;
    sampleSize.disabled = false;
  }
});
