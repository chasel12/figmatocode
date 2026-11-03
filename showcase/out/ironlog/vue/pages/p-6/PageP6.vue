<script setup>
const go = (href) => {
  window.location.href = href
}
</script>

<template>
  <main id="page-271" class="page-1">
    <div class="frame-1">
      <span class="text-1">{{ "PROFILE" }}</span>
      <span class="text-2">{{ "我的" }}</span>
    </div>
    <div class="rectangle-1"></div>
    <div class="frame-2">
      <svg class="oval-1" width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#E2E0DB" fill-rule="nonzero" stroke="#111111" stroke-width="1" ><path d="M 64 32 C 64 49.67 49.67 64 32 64 C 14.33 64 0 49.67 0 32 C 0 14.33 14.33 0 32 0 C 49.67 0 64 14.33 64 32 Z" /></svg>
      <div class="frame-3">
        <span class="text-3">{{ "陈默" }}</span>
        <span class="text-4">{{ "训练第 3 年" }}</span>
      </div>
    </div>
    <div class="rectangle-2"></div>
    <div class="frame-4">
      <div class="frame-5">
        <div class="frame-6">
          <span class="text-5">{{ "186" }}</span>
          <span class="text-6">{{ "次" }}</span>
        </div>
        <span class="text-7">{{ "训练次数" }}</span>
      </div>
      <div class="frame-7">
        <div class="frame-8">
          <span class="text-8">{{ "12" }}</span>
          <span class="text-9">{{ "周" }}</span>
        </div>
        <span class="text-10">{{ "连续周期" }}</span>
      </div>
      <div class="frame-9">
        <div class="frame-10">
          <span class="text-11">{{ "1240" }}</span>
          <span class="text-12">{{ "吨" }}</span>
        </div>
        <span class="text-13">{{ "累计负荷" }}</span>
      </div>
    </div>
    <div class="rectangle-3"></div>
    <div class="frame-11">
      <div class="frame-12">
        <span class="text-14">{{ "训练记录" }}</span>
        <svg class="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#A3A3A3" stroke-width="3" ><path d="m9 18 6-6-6-6" /></svg>
      </div>
      <div class="frame-13">
        <span class="text-15">{{ "进度曲线" }}</span>
        <svg class="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#A3A3A3" stroke-width="3" ><path d="m9 18 6-6-6-6" /></svg>
      </div>
      <div class="frame-14">
        <span class="text-16">{{ "单位设置" }}</span>
        <svg class="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#A3A3A3" stroke-width="3" ><path d="m9 18 6-6-6-6" /></svg>
      </div>
      <div class="frame-15">
        <span class="text-17">{{ "导出数据" }}</span>
        <svg class="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#A3A3A3" stroke-width="3" ><path d="m9 18 6-6-6-6" /></svg>
      </div>
      <div class="frame-16">
        <span class="text-18">{{ "关于铁志" }}</span>
        <svg class="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#A3A3A3" stroke-width="3" ><path d="m9 18 6-6-6-6" /></svg>
      </div>
    </div>
    <div class="rectangle-4"></div>
    <div class="frame-17">
      <div class="frame-18" @click="go('../p-1/index.html')">
        <span class="text-19">{{ "今日" }}</span>
      </div>
      <div class="frame-19" @click="go('../p-3/index.html')">
        <span class="text-20">{{ "动作库" }}</span>
      </div>
      <div class="frame-20">
        <span class="text-21">{{ "我的" }}</span>
        <div class="rectangle-5"></div>
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
  flex-direction: column;
  gap: 8px;
  padding: 40px 20px 20px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.2px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.text-2 {
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
  flex-direction: row;
  gap: 16px;
  align-items: center;
  padding: 28px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.oval-1 {
  box-sizing: border-box;
  width: 64px;
  height: 64px;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 28px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
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
  color: #111111;
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
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-8 {
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
  color: #111111;
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
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-10 {
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

.text-11 {
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

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  color: #A3A3A3;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 13px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #6B6B6B;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
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
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
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
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 60px;
  border: 1px solid #E2E0DB;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  color: #111111;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #E2E0DB;
}

.frame-17 {
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

.text-19 {
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

.frame-19 {
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

.text-20 {
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

.frame-20 {
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

.text-21 {
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

.rectangle-5 {
  box-sizing: border-box;
  width: 20px;
  height: 2px;
  background-color: #111111;
}
</style>
