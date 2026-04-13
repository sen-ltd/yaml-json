/**
 * i18n.js — Japanese / English translations
 */

export const translations = {
  ja: {
    title: 'YAML ↔ JSON 変換ツール',
    yamlLabel: 'YAML',
    jsonLabel: 'JSON',
    formatYaml: 'YAML を整形',
    formatJson: 'JSON を整形',
    copyYaml: 'YAML をコピー',
    copyJson: 'JSON をコピー',
    clearAll: 'クリア',
    examples: 'サンプル',
    exampleSimple: '基本設定',
    exampleK8s: 'Kubernetes',
    exampleGha: 'GitHub Actions',
    exampleNested: 'ネスト構造',
    errorYaml: 'YAML エラー',
    errorJson: 'JSON エラー',
    copied: 'コピーしました',
    theme: 'テーマ',
    themeDark: 'ダーク',
    themeLight: 'ライト',
    lang: 'EN',
    lineLabel: '行',
    validYaml: 'YAML 有効',
    validJson: 'JSON 有効',
  },
  en: {
    title: 'YAML ↔ JSON Converter',
    yamlLabel: 'YAML',
    jsonLabel: 'JSON',
    formatYaml: 'Format YAML',
    formatJson: 'Format JSON',
    copyYaml: 'Copy YAML',
    copyJson: 'Copy JSON',
    clearAll: 'Clear',
    examples: 'Examples',
    exampleSimple: 'Basic Config',
    exampleK8s: 'Kubernetes',
    exampleGha: 'GitHub Actions',
    exampleNested: 'Nested',
    errorYaml: 'YAML Error',
    errorJson: 'JSON Error',
    copied: 'Copied!',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    lang: 'JA',
    lineLabel: 'line',
    validYaml: 'YAML valid',
    validJson: 'JSON valid',
  },
};

export const examples = {
  simple: {
    label: { ja: '基本設定', en: 'Basic Config' },
    yaml: `# Application configuration
name: my-app
version: "1.0.0"
debug: false
port: 3000

database:
  host: localhost
  port: 5432
  name: mydb
  ssl: true

tags:
  - web
  - api
  - production
`,
  },
  k8s: {
    label: { ja: 'Kubernetes', en: 'Kubernetes' },
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            limits:
              memory: "128Mi"
              cpu: "500m"
`,
  },
  gha: {
    label: { ja: 'GitHub Actions', en: 'GitHub Actions' },
    yaml: `name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
`,
  },
  nested: {
    label: { ja: 'ネスト構造', en: 'Nested' },
    yaml: `company:
  name: SEN LLC
  founded: 2020
  active: true
  address:
    country: Japan
    city: Tokyo
  products:
    - id: 1
      name: Portfolio Tool
      tags:
        - web
        - oss
    - id: 2
      name: Data Converter
      tags:
        - cli
        - utility
  notes: |
    This is a multi-line
    block scalar example.
`,
  },
};
