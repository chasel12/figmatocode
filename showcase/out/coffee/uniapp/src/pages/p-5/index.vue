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
  <view id="page-275" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <text class="text-1">我的订单</text>
        <view class="rectangle-1"></view>
      </view>
      <text class="text-2">拾豆咖啡 · 望京 SOHO 店</text>
    </view>
    <view class="frame-3">
      <view class="frame-4">
        <text class="text-3">全部</text>
      </view>
      <view class="frame-5">
        <text class="text-4">进行中</text>
      </view>
      <view class="frame-6">
        <text class="text-5">已完成</text>
      </view>
      <view class="frame-7">
        <text class="text-6">已取消</text>
      </view>
    </view>
    <view class="frame-8">
      <view class="frame-9">
        <view class="frame-10">
          <text class="text-7">制作中</text>
          <view class="frame-11">
            <text class="text-8">约 8 分钟后</text>
          </view>
        </view>
        <view class="frame-12">
          <text class="text-9">取餐码</text>
          <text class="text-10">A26</text>
          <text class="text-11">请凭码到吧台取餐</text>
        </view>
        <view class="rectangle-2"></view>
        <view class="frame-13">
          <view class="frame-14">
            <text class="text-12">#S20240612-0087</text>
            <text class="text-13">14:52</text>
          </view>
          <text class="text-14">望京 SOHO 店</text>
          <text class="text-15">燕麦拿铁 大杯·热 等 2 件</text>
          <view class="frame-15">
            <text class="text-16">合计</text>
            <text class="text-17">¥73.00</text>
          </view>
        </view>
      </view>
      <view class="frame-16">
        <view class="frame-17">
          <text class="text-18">#S20240611-0052</text>
          <text class="text-19">已完成</text>
        </view>
        <view class="frame-18">
          <text class="text-20">06-11 09:20</text>
          <text class="text-21">望京 SOHO 店</text>
        </view>
        <text class="text-22">冰摇柠檬美式 大杯·冰 等 1 件</text>
        <view class="rectangle-3"></view>
        <view class="frame-19">
          <text class="text-23">合计</text>
          <text class="text-24">¥42.00</text>
        </view>
      </view>
      <view class="frame-20">
        <view class="frame-21">
          <text class="text-25">#S20240610-0031</text>
          <text class="text-26">已完成</text>
        </view>
        <view class="frame-22">
          <text class="text-27">06-10 16:05</text>
          <text class="text-28">望京 SOHO 店</text>
        </view>
        <text class="text-29">海盐焦糖玛奇朵 中杯·热 等 3 件</text>
        <view class="rectangle-4"></view>
        <view class="frame-23">
          <text class="text-30">合计</text>
          <text class="text-31">¥96.00</text>
        </view>
      </view>
      <view class="frame-24">
        <view class="frame-25">
          <text class="text-32">#S20240608-0019</text>
          <text class="text-33">已取消</text>
        </view>
        <view class="frame-26">
          <text class="text-34">06-08 12:40</text>
          <text class="text-35">望京 SOHO 店</text>
        </view>
        <text class="text-36">燕麦拿铁 中杯·热 等 2 件</text>
        <view class="rectangle-5"></view>
        <view class="frame-27">
          <text class="text-37">合计</text>
          <text class="text-38">¥58.00</text>
        </view>
      </view>
    </view>
    <view class="frame-28">
      <view class="frame-29" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNMTAgMnYyTTE0IDJ2Mk0xNiA4YTEgMSAwIDAgMSAxIDF2OGE0IDQgMCAwIDEtNCA0SDdhNCA0IDAgMCAxLTQtNFY5YTEgMSAwIDAgMSAxLTFoMTRhNCA0IDAgMSAxIDAgOGgtMU02IDJ2MiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-39">点单</text>
      </view>
      <view class="frame-30">
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjN2E2MzUwIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNNCAydjIwbDItMSAyIDEgMi0xIDIgMSAyLTEgMiAxIDItMSAyIDFWMmwtMiAxLTItMS0yIDEtMi0xLTIgMS0yLTEtMiAxWk0xNiA4aC02YTIgMiAwIDEgMCAwIDRoNGEyIDIgMCAxIDEgMCA0SDhNMTIgMTcuNXYtMTEiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-40">订单</text>
      </view>
      <view class="frame-31" @tap="switchTo('/pages/p-6/index')">
        <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-41">我的</text>
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
  padding: 0px 0px 80px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #faf5ef;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 24px 16px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
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
  font-size: 24px;
  font-weight: 600;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 48px;
  height: 4px;
  background-color: #8b9d77;
  border-radius: 2px;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 0px 24px 16px 24px;
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
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 16px;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.20);
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #faf5ef;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  opacity: 0.9;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  opacity: 0.9;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  width: fit-content;
  height: 36px;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  opacity: 0.9;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
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
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
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
  justify-content: center;
  padding: 0px 12px;
  width: fit-content;
  height: 28px;
  flex: 0 0 auto;
  background-color: #8b9d77;
  border-radius: 64px;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #faf5ef;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #faf5ef;
  border-radius: 16px;
  border: 1px dashed #d4a373;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.8px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 40px;
  font-weight: 700;
  line-height: 44px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 2px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #d4a373;
  opacity: 0.3;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
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
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #d4a373;
  opacity: 0.3;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 25px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
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
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #8b9d77;
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
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #d4a373;
  opacity: 0.3;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-31 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 25px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-32 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-33 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #8b9d77;
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
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-34 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-35 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-36 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-5 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #d4a373;
  opacity: 0.3;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-37 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-38 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 25px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-28 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 32px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 80px;
  background-color: #faf5ef;
  border: 1px solid #d4a373;
  box-shadow: 0px -6px 16px 0px rgba(122,99,80,0.08);
}

.frame-29 {
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
}

.vector-1 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.text-39 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-30 {
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
}

.vector-2 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.text-40 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-31 {
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
}

.vector-3 {
  box-sizing: border-box;
  width: 24px;
  height: 24px;
}

.text-41 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
