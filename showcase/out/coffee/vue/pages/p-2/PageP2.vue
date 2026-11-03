<script setup>
const go = (href) => {
  window.location.href = href
}
</script>

<template>
  <main id="page-507" class="page-1">
    <div class="frame-1">
      <div class="frame-2">
        <svg class="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#b5654a" stroke-width="2.4" ><path d="m15 18-6-6 6-6" /></svg>
      </div>
      <span class="text-1">{{ "拾豆咖啡" }}</span>
      <button class="button-1" type="button">{{ "下一步" }}</button>
    </div>
    <div class="frame-3">
      <div class="frame-4">
        <div class="frame-5">
          <svg class="vector-2" width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#b5654a" stroke-width="1" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
        </div>
      </div>
    </div>
    <div class="frame-6">
      <span class="text-2">{{ "燕麦拿铁" }}</span>
      <span class="text-3">{{ "OAT LATTE" }}</span>
      <div class="frame-7">
        <span class="text-4">{{ "¥32.00" }}</span>
        <span class="text-5">{{ "中杯 473ml · 使用燕麦奶" }}</span>
      </div>
    </div>
    <div class="rectangle-1"></div>
    <div class="frame-8">
      <span class="text-6">{{ "杯型" }}</span>
      <div class="frame-9">
        <div class="frame-10">
          <span class="text-7">{{ "中杯" }}</span>
          <span class="text-8">{{ "473ml" }}</span>
        </div>
        <div class="frame-11">
          <span class="text-9">{{ "大杯" }}</span>
          <span class="text-10">{{ "591ml" }}</span>
        </div>
        <div class="frame-12">
          <span class="text-11">{{ "超大杯" }}</span>
          <span class="text-12">{{ "709ml" }}</span>
        </div>
      </div>
    </div>
    <div class="frame-13">
      <span class="text-13">{{ "温度" }}</span>
      <div class="frame-14">
        <div class="frame-15">
          <svg class="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#faf5ef" stroke-width="3" ><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
          <span class="text-14">{{ "热" }}</span>
        </div>
        <div class="frame-16">
          <svg class="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fill-rule="nonzero" stroke="#7a6350" stroke-width="3" ><path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11M17 7A5 5 0 0 0 7 7M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4" /></svg>
          <span class="text-15">{{ "冰" }}</span>
        </div>
      </div>
    </div>
    <div class="frame-17">
      <span class="text-16">{{ "加料" }}</span>
      <div class="frame-18">
        <div class="frame-19">
          <div class="frame-20">
            <span class="text-17">{{ "燕麦奶加浓" }}</span>
            <span class="text-18">{{ "奶香更醇厚" }}</span>
          </div>
          <div class="frame-21">
            <span class="text-19">{{ "+¥3.00" }}</span>
            <div class="frame-22"></div>
          </div>
        </div>
        <div class="frame-23">
          <div class="frame-24">
            <span class="text-20">{{ "海盐奶盖" }}</span>
            <span class="text-21">{{ "微咸回甘" }}</span>
          </div>
          <div class="frame-25">
            <span class="text-22">{{ "+¥5.00" }}</span>
            <div class="frame-26"></div>
          </div>
        </div>
        <div class="frame-27">
          <div class="frame-28">
            <span class="text-23">{{ "焦糖糖浆" }}</span>
            <span class="text-24">{{ "焦香微苦" }}</span>
          </div>
          <div class="frame-29">
            <span class="text-25">{{ "+¥2.00" }}</span>
            <div class="frame-30"></div>
          </div>
        </div>
        <div class="frame-31">
          <div class="frame-32">
            <span class="text-26">{{ "双份浓缩" }}</span>
            <span class="text-27">{{ "提神加倍" }}</span>
          </div>
          <div class="frame-33">
            <span class="text-28">{{ "+¥6.00" }}</span>
            <div class="frame-34"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="frame-35">
      <div class="frame-36">
        <span class="text-29">{{ "合计" }}</span>
        <span class="text-30">{{ "¥32.00" }}</span>
      </div>
      <button class="button-2" type="button" @click="go('../p-3/index.html')">{{ "加入购物车" }}</button>
    </div>
  </main>
</template>

<style>
.page-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0px 0px 96px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #faf5ef;
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
  padding: 0px 16px;
  width: 100%;
  height: 56px;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #f1e5d8;
  border-radius: 9999px;
  border: 1px solid #d4a373;
}

.vector-1 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-1 {
  box-sizing: border-box;
  padding: 0px 12px;
  height: 36px;
  background-color: #b5654a;
  border-radius: 999px;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.2);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #faf5ef;
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

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 300px;
  background-color: #efdcc8;
  border-radius: 32px;
  border: 1px solid #d4a373;
  box-shadow: 0px 8px 24px 0px rgba(122,99,80,0.10);
  background-image: radial-gradient(ellipse at 50% 40%, rgba(212, 163, 115, 0.28) 0%, transparent 72%);
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  background-color: #faf5ef;
  border-radius: 999px;
  box-shadow: 0px 6px 16px 0px rgba(181,101,74,0.16);
}

.vector-2 {
  box-sizing: border-box;
  width: 48px;
  height: 48px;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 16px 16px 16px;
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
  font-size: 32px;
  font-weight: 600;
  line-height: 37px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.6px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 2.4px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  margin: 8px 0px 0px 0px;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 39px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.75;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: calc(100% - 32px);
  height: 1px;
  margin: 4px 16px;
  background-color: #d4a373;
  opacity: 0.3;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.6px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 64px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.6;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 64px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #f7e8da;
  border-radius: 16px;
  border: 2px solid #b5654a;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.14);
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 64px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
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
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.6;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 16px 16px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.6px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 44px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #b5654a;
  border-radius: 999px;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.22);
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
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
  color: #faf5ef;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 44px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #faf5ef;
  border-radius: 999px;
  border: 1px solid #d4a373;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 16px 16px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.6px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 64px;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 2px 8px 0px rgba(122,99,80,0.06);
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
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
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.65;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #faf5ef;
  border-radius: 5px;
  border: 1.5px solid #d4a373;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 64px;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 2px 8px 0px rgba(122,99,80,0.06);
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
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
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.65;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #faf5ef;
  border-radius: 5px;
  border: 1.5px solid #d4a373;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 64px;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 2px 8px 0px rgba(122,99,80,0.06);
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.65;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-30 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #faf5ef;
  border-radius: 5px;
  border: 1.5px solid #d4a373;
}

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 64px;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 2px 8px 0px rgba(122,99,80,0.06);
}

.frame-32 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.65;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-34 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #faf5ef;
  border-radius: 5px;
  border: 1.5px solid #d4a373;
}

.frame-35 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px;
  width: 100%;
  height: 88px;
  background-color: #faf5ef;
  border: 1px solid #d4a373;
  box-shadow: 0px -4px 20px 0px rgba(122,99,80,0.10);
  backdrop-filter: blur(12px);
}

.frame-36 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.65;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.2px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-2 {
  box-sizing: border-box;
  padding: 10px 12px;
  min-width: 106px;
  height: 48px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #b5654a;
  border-radius: 999px;
  box-shadow: 0px 6px 16px 0px rgba(181,101,74,0.28);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #faf5ef;
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

.button-1:active {
  opacity: 0.85;
}

.button-2:active {
  box-shadow: inset 0px 2px 4px 0px rgba(0,0,0,0.12);
  opacity: 0.9;
}
</style>
