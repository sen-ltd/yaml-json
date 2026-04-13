/**
 * main.js — DOM interactions and live conversion logic
 */

import { parseYaml, YamlParseError } from './yaml-parser.js';
import { toYaml } from './yaml-writer.js';
import { translations, examples } from './i18n.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let lang = localStorage.getItem('yjLang') || 'ja';
let theme = localStorage.getItem('yjTheme') || 'dark';
let lastSource = 'yaml'; // 'yaml' | 'json'
let converting = false;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

function t(key) {
  return translations[lang][key] || key;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  $('#btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('yjTheme', theme);
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
  localStorage.setItem('yjLang', lang);
}

function toggleLang() {
  lang = lang === 'ja' ? 'en' : 'ja';
  applyLang();
  updateExampleMenu();
}

// ---------------------------------------------------------------------------
// Status bars
// ---------------------------------------------------------------------------
function setStatus(side, type, message) {
  // type: 'ok' | 'error' | 'idle'
  const bar = $(`#status-${side}`);
  bar.className = `status-bar status-${type}`;
  bar.textContent = message;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------
function yamlToJson(yamlText) {
  const obj = parseYaml(yamlText);
  return JSON.stringify(obj, null, 2);
}

function jsonToYaml(jsonText) {
  const obj = JSON.parse(jsonText);
  return toYaml(obj);
}

function convertFromYaml() {
  if (converting) return;
  converting = true;
  const yamlText = $('#yaml-editor').value;
  if (yamlText.trim() === '') {
    $('#json-editor').value = '';
    setStatus('yaml', 'idle', '');
    setStatus('json', 'idle', '');
    converting = false;
    return;
  }
  try {
    $('#json-editor').value = yamlToJson(yamlText);
    setStatus('yaml', 'ok', t('validYaml'));
    setStatus('json', 'ok', t('validJson'));
  } catch (e) {
    if (e instanceof YamlParseError) {
      setStatus('yaml', 'error', `${t('errorYaml')} (${t('lineLabel')} ${e.line}): ${e.message}`);
    } else {
      setStatus('yaml', 'error', `${t('errorYaml')}: ${e.message}`);
    }
    setStatus('json', 'idle', '');
  }
  converting = false;
}

function convertFromJson() {
  if (converting) return;
  converting = true;
  const jsonText = $('#json-editor').value;
  if (jsonText.trim() === '') {
    $('#yaml-editor').value = '';
    setStatus('yaml', 'idle', '');
    setStatus('json', 'idle', '');
    converting = false;
    return;
  }
  try {
    $('#yaml-editor').value = jsonToYaml(jsonText);
    setStatus('json', 'ok', t('validJson'));
    setStatus('yaml', 'ok', t('validYaml'));
  } catch (e) {
    setStatus('json', 'error', `${t('errorJson')}: ${e.message}`);
    setStatus('yaml', 'idle', '');
  }
  converting = false;
}

// ---------------------------------------------------------------------------
// Format buttons
// ---------------------------------------------------------------------------
function formatYaml() {
  const yamlText = $('#yaml-editor').value;
  if (!yamlText.trim()) return;
  try {
    const obj = parseYaml(yamlText);
    $('#yaml-editor').value = toYaml(obj);
    setStatus('yaml', 'ok', t('validYaml'));
  } catch (e) {
    if (e instanceof YamlParseError) {
      setStatus('yaml', 'error', `${t('errorYaml')} (${t('lineLabel')} ${e.line}): ${e.message}`);
    } else {
      setStatus('yaml', 'error', `${t('errorYaml')}: ${e.message}`);
    }
  }
}

function formatJson() {
  const jsonText = $('#json-editor').value;
  if (!jsonText.trim()) return;
  try {
    const obj = JSON.parse(jsonText);
    $('#json-editor').value = JSON.stringify(obj, null, 2);
    setStatus('json', 'ok', t('validJson'));
  } catch (e) {
    setStatus('json', 'error', `${t('errorJson')}: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Copy buttons
// ---------------------------------------------------------------------------
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = t('copied');
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------
function updateExampleMenu() {
  const menu = $('#example-menu');
  if (!menu) return;
  menu.innerHTML = '';
  Object.entries(examples).forEach(([key, ex]) => {
    const btn = document.createElement('button');
    btn.className = 'example-btn';
    btn.textContent = ex.label[lang];
    btn.addEventListener('click', () => {
      $('#yaml-editor').value = ex.yaml;
      convertFromYaml();
      menu.classList.remove('open');
    });
    menu.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------
function clearAll() {
  $('#yaml-editor').value = '';
  $('#json-editor').value = '';
  setStatus('yaml', 'idle', '');
  setStatus('json', 'idle', '');
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  applyLang();
  updateExampleMenu();

  const yamlEditor = $('#yaml-editor');
  const jsonEditor = $('#json-editor');

  // Live conversion
  const debouncedYaml = debounce(convertFromYaml, 300);
  const debouncedJson = debounce(convertFromJson, 300);

  yamlEditor.addEventListener('input', () => {
    lastSource = 'yaml';
    debouncedYaml();
  });

  jsonEditor.addEventListener('input', () => {
    lastSource = 'json';
    debouncedJson();
  });

  // Toolbar buttons
  $('#btn-theme').addEventListener('click', toggleTheme);
  $('#btn-lang').addEventListener('click', toggleLang);
  $('#btn-clear').addEventListener('click', clearAll);

  $('#btn-format-yaml').addEventListener('click', formatYaml);
  $('#btn-format-json').addEventListener('click', formatJson);

  $('#btn-copy-yaml').addEventListener('click', () => {
    copyText(yamlEditor.value, $('#btn-copy-yaml'));
  });
  $('#btn-copy-json').addEventListener('click', () => {
    copyText(jsonEditor.value, $('#btn-copy-json'));
  });

  // Examples dropdown
  const examplesToggle = $('#btn-examples');
  const examplesMenu = $('#example-menu');
  examplesToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    examplesMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    examplesMenu.classList.remove('open');
  });

  // Load default example
  const defaultEx = examples.simple;
  yamlEditor.value = defaultEx.yaml;
  convertFromYaml();
});
