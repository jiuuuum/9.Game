---
description: results/students.csv에서 학생 성적 데이터를 읽어 형식을 검증하고 요약 (선생님 모드 - 데이터 수집 단계)
argument-hint: [csv 경로]
allowed-tools: Read, Write, Bash
---

선생님 모드의 첫 단계로, 학생들의 퀴즈 결과 데이터를 모아 형식을 검증한다.

**데이터 형식**: `results/students.csv`, 컬럼은 `name,category,difficulty,score,correctCount,totalQuestions,date` 순서다.

- `name`: 학생 이름 (필수)
- `category`: `한국사`/`과학`/`지리`/`스포츠`/`전체` 중 하나 (필수, 여러 카테고리가 섞인 시험이면 `전체`)
- `difficulty`: `easy`/`medium`/`hard`/`전체` 중 하나 (필수)
- `score`: 점수 (숫자, 필수)
- `correctCount`: 맞힌 문제 수 (0 이상 정수)
- `totalQuestions`: 전체 문제 수 (1 이상 정수)
- `date`: 응시 날짜 `YYYY-MM-DD` (선택, 비어 있어도 됨)

학생이 결과 화면(현재 구현된 result-screen)에 표시된 점수·맞힌 문제 수를 선생님에게 알려주면, 선생님이 이 CSV에 한 줄씩 기록하는 것을 전제로 한다.

대상 경로: $ARGUMENTS

- 비어 있으면 기본값 `results/students.csv`를 사용한다.

1. 지정된 경로의 파일이 있는지 확인한다.
   - 파일이 없으면: `results/` 폴더가 없으면 새로 만들고, 헤더 행(`name,category,difficulty,score,correctCount,totalQuestions,date`)만 있는 빈 템플릿 CSV를 생성한다. 위 데이터 형식을 사용자에게 안내하고 "아직 학생 데이터가 없어 템플릿을 생성했습니다"라고 보고한 뒤 종료한다. (이는 실패가 아니라 정상적인 초기 상태다.)
2. 파일이 있으면 한 줄씩 읽어 검증한다.
   - 헤더가 위 7개 컬럼과 정확히 일치하는가.
   - 각 데이터 행: `name`이 비어 있지 않은가 / `category`가 유효한 값인가 / `difficulty`가 유효한 값인가 / `score`가 숫자인가 / `correctCount`·`totalQuestions`가 0 이상의 정수이고 `correctCount` ≤ `totalQuestions`인가 / `totalQuestions` > 0인가.
   - 어긋나는 행은 무효 처리하고 (줄 번호, 원본 내용, 사유)를 목록으로 남긴다 — 이것 때문에 전체 명령을 중단하지는 않는다.
3. 완전히 동일한 행(7개 컬럼 값이 모두 같음)이 여러 개 있으면 중복 의심으로 표시한다 (경고만 하고 제거하지 않는다).
4. 결과를 요약해서 보고한다: 전체 행 수, 유효 행 수, 무효 행 수(사유 목록 포함), 중복 의심 행, 파악된 고유 학생 수.
5. 파일을 수정하지 않는다 (1번에서 템플릿을 새로 만드는 경우는 예외).
