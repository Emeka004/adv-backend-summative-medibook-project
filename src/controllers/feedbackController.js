const path = require('path');
const fs = require('fs');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showFeedback(req, res) {
  const supportedLocales = new Set(['en', 'fr']);
  const locale = supportedLocales.has(String(req.query.lang || '').toLowerCase())
    ? String(req.query.lang).toLowerCase()
    : 'en';

  let translations;
  try {
    translations = require(path.resolve(
      __dirname,
      '..',
      '..',
      'locales',
      `${locale}.json`
    ));
  } catch (error) {
    translations = require(path.resolve(
      __dirname,
      '..',
      '..',
      'locales',
      'en.json'
    ));
  }

  const localeTag = locale === 'fr' ? 'fr-FR' : 'en-US';
  const date = new Intl.DateTimeFormat(localeTag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const answers = [
    'I found the ES6 classes and inheritance topic most challenging because it requires a lot of practice to become familiar with.',
    'I think the topic that clicked after practice assignments was definitely unit testing. I did some research on it, found out the different types of testing and their advantages, and the video resources were helpful.',
    "I'll be honest, it hasn't changed much; I think it has a lot of similarities to how I did them in previous trimesters. The only difference I would say is the use of different types of databases, like NoSQL, and ORMs.",
    "I would say the teaching is very organised and strict. I wouldn't change much to be honest; I think I am quite satisfied with it.",
    'I would like to apply these skills in future projects for startups, general practice, or individual projects. I would also use them when building the backend of different apps I would like to build.'
  ];

  const questions = translations.questions
    .map((question, index) => `
      <div class="question">
        <label for="question-${index + 1}">
          ${index + 1}. ${escapeHtml(question)}
        </label>
        <textarea id="question-${index + 1}" name="question_${index + 1}" required>${escapeHtml(answers[index])}</textarea>
      </div>`)
    .join('');

  const templatePath = path.resolve(
    __dirname,
    '..',
    '..',
    'public',
    'feedback.html'
  );
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    return res.status(500).json({ error: 'Feedback page template not found' });
  }

  const html = template
    .replace(/{{locale}}/g, locale)
    .replace(/{{title}}/g, escapeHtml(translations.title))
    .replace(/{{instructions}}/g, escapeHtml(translations.instructions))
    .replace(/{{date}}/g, escapeHtml(date))
    .replace(/{{questions}}/g, questions)
    .replace(/{{submit}}/g, escapeHtml(translations.submit));

  res.type('html').send(html);
}

module.exports = { showFeedback };
