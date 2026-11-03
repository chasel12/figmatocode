<script setup>
// 平级导航（底栏互链）走 reLaunch：小程序页面栈上限 10 层，
// navigateTo 连点底栏会把栈堆满，之后所有跳转静默失败
const go = (url) => {
  uni.navigateTo({ url })
}
const switchTo = (url) => {
  uni.reLaunch({ url })
}
</script>

<template>
  <view id="page-1" class="page-1">
    <view class="frame-1">
      <text class="text-1">铁志</text>
    </view>
    <view class="rectangle-1"></view>
    <view class="frame-2">
      <text class="text-2">MON · 第 6 周</text>
      <text class="text-3">今日</text>
    </view>
    <view class="frame-3">
      <view class="frame-4">
        <text class="text-4">本周完成</text>
        <view class="frame-5">
          <text class="text-5">3 / 4</text>
          <text class="text-6">次</text>
        </view>
      </view>
      <view class="rectangle-2"></view>
      <view class="frame-6">
        <text class="text-7">累计容量</text>
        <view class="frame-7">
          <text class="text-8">12.4</text>
          <text class="text-9">吨</text>
        </view>
      </view>
    </view>
    <view class="frame-8">
      <text class="text-10">今日计划</text>
      <view class="frame-9">
        <view class="frame-10">
          <text class="text-11">杠铃深蹲</text>
          <text class="text-12">5×5</text>
          <text class="text-13">100kg</text>
        </view>
        <view class="frame-11">
          <text class="text-14">罗马尼亚硬拉</text>
          <text class="text-15">4×8</text>
          <text class="text-16">80kg</text>
        </view>
        <view class="frame-12">
          <text class="text-17">腿举</text>
          <text class="text-18">3×12</text>
          <text class="text-19">160kg</text>
        </view>
        <view class="frame-13">
          <text class="text-20">站姿提踵</text>
          <text class="text-21">3×15</text>
          <text class="text-22">60kg</text>
        </view>
        <view class="rectangle-3"></view>
      </view>
    </view>
    <view class="frame-14">
      <view class="button-1">开始训练</view>
    </view>
    <view class="frame-15">
      <view class="frame-16">
        <text class="text-23">今日</text>
        <view class="rectangle-4"></view>
      </view>
      <view class="frame-17" @tap="switchTo('/pages/p-3/index')">
        <text class="text-24">动作库</text>
      </view>
      <view class="frame-18" @tap="switchTo('/pages/p-6/index')">
        <text class="text-25">我的</text>
      </view>
    </view>
  </view>
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
