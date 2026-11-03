<script setup>
const go = (href) => {
  window.location.href = href
}
</script>

<template>
  <main id="page-1" class="page-1">
    <div class="frame-1">
      <span class="text-1">{{ "铁志" }}</span>
    </div>
    <div class="rectangle-1"></div>
    <div class="frame-2">
      <span class="text-2">{{ "MON · 第 6 周" }}</span>
      <span class="text-3">{{ "今日" }}</span>
    </div>
    <div class="frame-3">
      <div class="frame-4">
        <span class="text-4">{{ "本周完成" }}</span>
        <div class="frame-5">
          <span class="text-5">{{ "3 / 4" }}</span>
          <span class="text-6">{{ "次" }}</span>
        </div>
      </div>
      <div class="rectangle-2"></div>
      <div class="frame-6">
        <span class="text-7">{{ "累计容量" }}</span>
        <div class="frame-7">
          <span class="text-8">{{ "12.4" }}</span>
          <span class="text-9">{{ "吨" }}</span>
        </div>
      </div>
    </div>
    <div class="frame-8">
      <span class="text-10">{{ "今日计划" }}</span>
      <div class="frame-9">
        <div class="frame-10">
          <span class="text-11">{{ "杠铃深蹲" }}</span>
          <span class="text-12">{{ "5×5" }}</span>
          <span class="text-13">{{ "100kg" }}</span>
        </div>
        <div class="frame-11">
          <span class="text-14">{{ "罗马尼亚硬拉" }}</span>
          <span class="text-15">{{ "4×8" }}</span>
          <span class="text-16">{{ "80kg" }}</span>
        </div>
        <div class="frame-12">
          <span class="text-17">{{ "腿举" }}</span>
          <span class="text-18">{{ "3×12" }}</span>
          <span class="text-19">{{ "160kg" }}</span>
        </div>
        <div class="frame-13">
          <span class="text-20">{{ "站姿提踵" }}</span>
          <span class="text-21">{{ "3×15" }}</span>
          <span class="text-22">{{ "60kg" }}</span>
        </div>
        <div class="rectangle-3"></div>
      </div>
    </div>
    <div class="frame-14">
      <button class="button-1" type="button">{{ "开始训练" }}</button>
    </div>
    <div class="frame-15">
      <div class="frame-16">
        <span class="text-23">{{ "今日" }}</span>
        <div class="rectangle-4"></div>
      </div>
      <div class="frame-17" @click="go('../p-3/index.html')">
        <span class="text-24">{{ "动作库" }}</span>
      </div>
      <div class="frame-18" @click="go('../p-6/index.html')">
        <span class="text-25">{{ "我的" }}</span>
      </div>
    </div>
  </main>
</template>

<style>
.page-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0px 0px 64px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #F7F6F3;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 20px;
  width: 100%;
  height: 48px;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 32px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #111111;
  border-radius: 0px;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #F7F6F3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #3A3A3A;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.7px;
  color: #F7F6F3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 56px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 56px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 56px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 56px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0px 20px 32px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.button-1 {
  box-sizing: border-box;
  padding: 10px 12px;
  width: 100%;
  height: 48px;
  min-width: 78px;
  background-color: #111111;
  border-radius: 0px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #F7F6F3;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  appearance: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.frame-15 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  align-items: center;
  justify-content: space-between;
  padding: 0px 24px;
  width: 100%;
  height: 64px;
  background-color: #F7F6F3;
  border: 1px solid #E2E0DB;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 20px;
  height: 2px;
  background-color: #111111;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #9A9A9A;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: transparent;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #9A9A9A;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-1:active {
  opacity: 0.8;
}
</style>
