'use strict';

const HolaStudy = (() => {
  const units = [
    'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
    'veintisiete', 'veintiocho', 'veintinueve'
  ];
  const tens = ['treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const numbers = Array.from({length:101}, (_, n) => {
    if (n < 30) return units[n];
    if (n === 100) return 'cien';
    const ten = tens[Math.floor(n / 10) - 3];
    return n % 10 ? `${ten} y ${units[n % 10]}` : ten;
  });
  const normalize = value => String(value).normalize('NFC').toLowerCase().replace(/[¿?¡!.,:;]/g, '').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  // In Spanish ñ is a letter. Fold the written accents and diaeresis, but keep ñ distinct.
  const fold = (value, lang) => lang === 'es'
    ? value.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')
    : value.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');
  const splitArticle = (value, lang) => lang === 'es' ? /^(el|la|los|las) (.+)$/.exec(value) : null;

  function oneEdit(expected, given, lang) {
    const left = expected.split(' '), right = given.split(' ');
    if (left.length !== right.length) return false;
    const changes = left.map((token, i) => [token, right[i]]).filter(([a,b]) => a !== b);
    if (changes.length !== 1) return false;
    const [[a,b]] = changes;
    if (!/^\p{L}{5,}$/u.test(a) || !/^\p{L}{4,}$/u.test(b) || Math.abs(a.length - b.length) > 1) return false;
    // Do not count ñ/n interchange as an ordinary typo.
    if (a.replace(/ñ/g, 'n') === b.replace(/ñ/g, 'n')) return false;
    if (lang === 'es') {
      const changesNumber = a + 's' === b || b + 's' === a;
      const changesGender = a.slice(0, -1) === b.slice(0, -1) && /^(oa|ao)$/.test(a.slice(-1) + b.slice(-1));
      if (changesNumber || changesGender) return false;
    }
    const [shorter,longer] = a.length <= b.length ? [a,b] : [b,a];
    let i = 0;
    while (shorter[i] === longer[i] && i < shorter.length) i++;
    if (shorter.length !== longer.length) return shorter.slice(i) === longer.slice(i + 1);
    if (shorter.slice(i + 1) === longer.slice(i + 1)) return true;
    return shorter[i] === longer[i + 1] && shorter[i + 1] === longer[i] && shorter.slice(i + 2) === longer.slice(i + 2);
  }

  function grade(value, expected, alternatives, lang, isOther = () => false) {
    const given = normalize(value);
    const variants = [expected, ...alternatives].map(text => ({text, exact:normalize(text)}));
    const exact = variants.find(variant => variant.exact === given);
    if (exact) return {kind:'correct', expected:exact.text};
    const wrong = {kind:'wrong', reason:'wrong', expected};
    if (!given) return wrong;
    const givenArticle = splitArticle(given, lang);
    const givenCore = givenArticle?.[2] || given;
    const near = [];
    const grammar = [];
    for (const variant of variants) {
      const target = splitArticle(variant.exact, lang);
      const core = target?.[2] || variant.exact;
      const sameCore = core === givenCore;
      const sameSpelling = fold(core, lang) === fold(givenCore, lang);
      if (target && givenArticle && target[1] !== givenArticle[1]) {
        if (sameSpelling) grammar.push({kind:'wrong', reason:'article-wrong', expected:variant.text, article:target[1]});
      } else if (target && !givenArticle) {
        if (sameCore) near.push({kind:'almost', reason:'article-missing', expected:variant.text, article:target[1]});
      } else if (!givenArticle || target) {
        if (sameSpelling && !isOther(given)) near.push({kind:'almost', reason:'accent', expected:variant.text});
        else if (!isOther(given) && !isOther(givenCore) && oneEdit(core, givenCore, lang)) near.push({kind:'almost', reason:'typo', expected:variant.text});
      }
    }
    return near.find(result => result.reason === 'article-missing') || grammar[0] ||
      near.find(result => result.reason === 'accent') || near[0] || wrong;
  }

  function gradeNumber(value, number) {
    const alternatives = number === 100 ? ['ciento'] : [];
    return grade(value, numbers[number], alternatives, 'es', given => numbers.includes(given) || given === 'ciento');
  }

  function vocabulary(words, lang) {
    const forms = new Set();
    for (const word of words) {
      for (const value of [word[lang], ...(word[lang === 'es' ? 'altEs' : 'altPl'] || [])]) {
        const exact = normalize(value);
        forms.add(exact);
        const article = splitArticle(exact, lang);
        if (article) forms.add(article[2]);
      }
    }
    return forms;
  }

  const levels = [[0,10], [11,20], [21,50], [51,100]].map(([min,max], i) => ({
    i, label:`${min}–${max}`, values:numbers.slice(min, max + 1).map((_, n) => min + n),
    goal:Math.ceil((max - min + 1) * .6)
  }));

  return {numbers, levels, grade, gradeNumber, vocabulary};
})();
