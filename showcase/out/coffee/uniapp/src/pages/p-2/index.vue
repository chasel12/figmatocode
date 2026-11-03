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
  <view id="page-507" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xNSAxOC02LTYgNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <text class="text-1">拾豆咖啡</text>
      <view class="button-1">下一步</view>
    </view>
    <view class="frame-3">
      <view class="frame-4">
        <view class="frame-5">
          <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEiID48cGF0aCBkPSJNMTAgMnYyTTE0IDJ2Mk0xNiA4YTEgMSAwIDAgMSAxIDF2OGE0IDQgMCAwIDEtNCA0SDdhNCA0IDAgMCAxLTQtNFY5YTEgMSAwIDAgMSAxLTFoMTRhNCA0IDAgMSAxIDAgOGgtMU02IDJ2MiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
    </view>
    <view class="frame-6">
      <text class="text-2">燕麦拿铁</text>
      <text class="text-3">OAT LATTE</text>
      <view class="frame-7">
        <text class="text-4">¥32.00</text>
        <text class="text-5">中杯 473ml · 使用燕麦奶</text>
      </view>
    </view>
    <view class="rectangle-1"></view>
    <view class="frame-8">
      <text class="text-6">杯型</text>
      <view class="frame-9">
        <view class="frame-10">
          <text class="text-7">中杯</text>
          <text class="text-8">473ml</text>
        </view>
        <view class="frame-11">
          <text class="text-9">大杯</text>
          <text class="text-10">591ml</text>
        </view>
        <view class="frame-12">
          <text class="text-11">超大杯</text>
          <text class="text-12">709ml</text>
        </view>
      </view>
    </view>
    <view class="frame-13">
      <text class="text-13">温度</text>
      <view class="frame-14">
        <view class="frame-15">
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmFmNWVmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOC41IDE0LjVBMi41IDIuNSAwIDAgMCAxMSAxMmMwLTEuMzgtLjUtMi0xLTMtMS4wNzItMi4xNDMtLjIyNC00LjA1NCAyLTYgLjUgMi41IDIgNC45IDQgNi41IDIgMS42IDMgMy41IDMgNS41YTcgNyAwIDEgMS0xNCAwYzAtMS4xNTMuNDMzLTIuMjk0IDEtM2EyLjUgMi41IDAgMCAwIDIuNSAyLjV6IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-14">热</text>
        </view>
        <view class="frame-16">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjN2E2MzUwIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtNyAxMSA0LjA4IDEwLjM1YTEgMSAwIDAgMCAxLjg0IDBMMTcgMTFNMTcgN0E1IDUgMCAwIDAgNyA3TTE3IDdhMiAyIDAgMCAxIDAgNEg3YTIgMiAwIDAgMSAwLTQiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-15">冰</text>
        </view>
      </view>
    </view>
    <view class="frame-17">
      <text class="text-16">加料</text>
      <view class="frame-18">
        <view class="frame-19">
          <view class="frame-20">
            <text class="text-17">燕麦奶加浓</text>
            <text class="text-18">奶香更醇厚</text>
          </view>
          <view class="frame-21">
            <text class="text-19">+¥3.00</text>
            <view class="frame-22"></view>
          </view>
        </view>
        <view class="frame-23">
          <view class="frame-24">
            <text class="text-20">海盐奶盖</text>
            <text class="text-21">微咸回甘</text>
          </view>
          <view class="frame-25">
            <text class="text-22">+¥5.00</text>
            <view class="frame-26"></view>
          </view>
        </view>
        <view class="frame-27">
          <view class="frame-28">
            <text class="text-23">焦糖糖浆</text>
            <text class="text-24">焦香微苦</text>
          </view>
          <view class="frame-29">
            <text class="text-25">+¥2.00</text>
            <view class="frame-30"></view>
          </view>
        </view>
        <view class="frame-31">
          <view class="frame-32">
            <text class="text-26">双份浓缩</text>
            <text class="text-27">提神加倍</text>
          </view>
          <view class="frame-33">
            <text class="text-28">+¥6.00</text>
            <view class="frame-34"></view>
          </view>
        </view>
      </view>
    </view>
    <view class="frame-35">
      <view class="frame-36">
        <text class="text-29">合计</text>
        <text class="text-30">¥32.00</text>
      </view>
      <view class="button-2" @tap="go('/pages/p-3/index')">加入购物车</view>
    </view>
  </view>
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
