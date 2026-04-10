# 디저트 게임 UX 원칙

> 여성 타깃 캐주얼 디저트 게임의 일관된 UX/비주얼 방향성 <!-- coverage: high -->

## 관련 토픽
- [game-overview](../topics/game-overview.md)
- [design-system](../topics/design-system.md)
- [special-fx](../topics/special-fx.md)

---

## 핵심 원칙

**"폭발감보다 예쁜 만족감"**

Sweet Crunch의 모든 UX 결정은 이 한 문장을 기준으로 판단한다.

## 시각 방향
- 강한 불꽃, 검은 연기, 날카로운 전기 느낌 → **최소화**
- 크림, 글레이즈, 설탕가루, 리본, 하트, 별빛, 잔광 → **우선**
- "파괴"보다 "달콤하게 퍼지는 변화"처럼 느껴져야 함

## 사용자 감정 목표
특수 젬을 터뜨렸을 때 플레이어가 느껴야 하는 감정:
- 시원하다
- 예쁘다
- 기분 좋다
- 다음에도 또 만들고 싶다

## 금지 사항 (Design Do's & Don'ts)
| 금지 | 대체 |
|------|------|
| 순수 검정 (#000000) | on-background (#221a0f) 따뜻한 갈색 |
| 90도 직각 코너 | 모든 요소 rounded (최소 4px) |
| Standard shimmer 로딩 | surface-tint soft pulse ("rising dough") |
| 1px 솔리드 테두리 구분 | 색조 차이 또는 간격 |
| 원색 무지개 | 셔벗 계열 파스텔 무지개 |

## 반복 플레이 고려
- 캐스케이드 상황에서도 화면이 지저분해지지 않아야 함
- 아이들 FX는 발동 FX보다 더 오래 보이므로 피로하지 않게
- 모션 강도 계수(`getMotionFactor()`) 지원으로 접근성 고려

---
*Last compiled: 2026-04-10*
