# 주식 분석기 — Vercel 배포 가이드

환경변수 2개, 총 10분이면 배포 완료.

---

## STEP 1. GitHub에 올리기

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_ID/stock-analyzer.git
git push -u origin main
```

---

## STEP 2. Vercel 배포

1. https://vercel.com → **New Project**
2. GitHub repo 선택
3. **Environment Variables** 탭에서 2개 입력:

   | Key | Value |
   |-----|-------|
   | `FMP_API_KEY` | financialmodelingprep.com API 키 |
   | `ANTHROPIC_API_KEY` | console.anthropic.com API 키 |

4. **Deploy** 클릭 → 완료

---

## STEP 3. 지인 공유

배포 후 생성된 URL을 그대로 공유하면 끝.

```
https://stock-analyzer-xyz.vercel.app
```

- URL은 구글에 색인 안 됨
- 랜덤 문자열이라 추측 불가
- 직접 공유하지 않으면 접근 불가

---

## 로컬 개발

```bash
cp .env.example .env.local
# .env.local 에 실제 값 입력

npm install
npm run dev
# http://localhost:3000
```

---

## 예상 성능

- FMP 데이터 수집: ~1초 (5개 API 병렬)
- Claude 분석: ~5초
- **총 응답 시간: 5~8초**
