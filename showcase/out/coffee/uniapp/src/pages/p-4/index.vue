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
  <view id="page-581" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xNSAxOC02LTYgNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <text class="text-1">确认订单</text>
      <view class="frame-3"></view>
    </view>
    <view class="frame-4">
      <view class="frame-5">
        <view class="frame-6">
          <view class="frame-7">
            <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmFmNWVmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtMiA3IDQuNDEtNC40MUEyIDIgMCAwIDEgNy44MyAyaDguMzRhMiAyIDAgMCAxIDEuNDIuNTlMMjIgN000IDEydjhhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0ydi04TTE1IDIydi00YTIgMiAwIDAgMC0yLTJoLTJhMiAyIDAgMCAwLTIgMnY0TTIgN2gyME0yMiA3djNhMiAyIDAgMCAxLTIgMmEyLjcgMi43IDAgMCAxLTEuNTktLjYzLjcuNyAwIDAgMC0uODIgMEEyLjcgMi43IDAgMCAxIDE2IDEyYTIuNyAyLjcgMCAwIDEtMS41OS0uNjMuNy43IDAgMCAwLS44MiAwQTIuNyAyLjcgMCAwIDEgMTIgMTJhMi43IDIuNyAwIDAgMS0xLjU5LS42My43LjcgMCAwIDAtLjgyIDBBMi43IDIuNyAwIDAgMSA4IDEyYTIuNyAyLjcgMCAwIDEtMS41OS0uNjMuNy43IDAgMCAwLS44MiAwQTIuNyAyLjcgMCAwIDEgNCAxMmEyIDIgMCAwIDEtMi0yVjciIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-2">自取</text>
          </view>
          <view class="frame-8">
            <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjN2E2MzUwIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTQgMThWNmEyIDIgMCAwIDAtMi0ySDRhMiAyIDAgMCAwLTIgMnYxMWExIDEgMCAwIDAgMSAxaDJNMTUgMThIOU0xOSAxOGgyYTEgMSAwIDAgMCAxLTF2LTMuNjVhMSAxIDAgMCAwLS4yMi0uNjI0bC0zLjQ4LTQuMzVBMSAxIDAgMCAwIDE3LjUyIDhIMTRNMTUgMThhMiAyIDAgMSAwIDQgMGEyIDIgMCAxIDAgLTQgME01IDE4YTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwIC00IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-3">外送</text>
          </view>
        </view>
        <view class="frame-9">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0yMCAxMGMwIDQuOTkzLTUuNTM5IDEwLjE5My03LjM5OSAxMS43OTlhMSAxIDAgMCAxLTEuMjAyIDBDOS41MzkgMjAuMTkzIDQgMTQuOTkzIDQgMTBhOCA4IDAgMCAxIDE2IDBNOSAxMGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <view class="frame-10">
            <text class="text-4">望京 SOHO 店</text>
            <text class="text-5">预计 15:20 可取</text>
          </view>
        </view>
      </view>
      <view class="frame-11">
        <text class="text-6">订单商品</text>
        <view class="frame-12">
          <view class="image-1 ui-image-placeholder ui-image-ph-photo-84"></view>
          <view class="frame-13">
            <text class="text-7">燕麦拿铁</text>
            <text class="text-8">大杯 · 热</text>
            <text class="text-9">¥37.00</text>
          </view>
          <text class="text-10">×1</text>
        </view>
        <view class="frame-14">
          <view class="image-2 ui-image-placeholder ui-image-ph-photo-118"></view>
          <view class="frame-15">
            <text class="text-11">海盐焦糖玛奇朵</text>
            <text class="text-12">中杯 · 冰</text>
            <text class="text-13">¥36.00</text>
          </view>
          <text class="text-14">×1</text>
        </view>
        <view class="frame-16">
          <view class="image-3 ui-image-placeholder ui-image-ph-photo-305"></view>
          <view class="frame-17">
            <text class="text-15">巴斯克芝士蛋糕</text>
            <text class="text-16">切片装</text>
            <text class="text-17">¥26.00</text>
          </view>
          <text class="text-18">×1</text>
        </view>
      </view>
      <view class="frame-18">
        <view class="frame-19">
          <text class="text-19">商品小计</text>
          <text class="text-20">¥99.00</text>
        </view>
        <view class="frame-20">
          <text class="text-21">优惠</text>
          <text class="text-22">-¥5.00</text>
        </view>
        <view class="rectangle-1"></view>
        <view class="frame-21">
          <text class="text-23">实付</text>
          <text class="text-24">¥94.00</text>
        </view>
      </view>
      <view class="frame-22">
        <view class="frame-23">
          <view class="frame-24">
            <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjOGI5ZDc3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNNy45IDIwQTkgOSAwIDEgMCA0IDE2LjFMMiAyMloiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-25">微信支付</text>
        </view>
        <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZDRhMzczIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im05IDE4IDYtNi02LTYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-25">
      <view class="frame-26">
        <text class="text-26">实付金额</text>
        <text class="text-27">¥94.00</text>
      </view>
      <view class="button-1" @tap="go('/pages/p-5/index')">提交订单 ¥94.00</view>
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
  background-color: #faf5ef;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #d4a373;
  box-shadow: 0px 2px 6px 0px rgba(181,101,74,0.10);
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
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 36px;
  height: 36px;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 20px 0px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 4px;
  width: 100%;
  height: 40px;
  background-color: #f1f3f5;
  border-radius: 16px;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 36px;
  flex: 1 1 0;
  flex-grow: 1;
  background-color: #b5654a;
  border-radius: 10px;
  box-shadow: 0px 2px 6px 0px rgba(181,101,74,0.24);
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #faf5ef;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 36px;
  flex: 1 1 0;
  flex-grow: 1;
  border-radius: 8px;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-4 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
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

.image-1 {
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  background-color: #f1f3f5;
  border-radius: 10px;
  object-fit: cover;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #d4a373;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
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
  opacity: 0.75;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
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

.image-2 {
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  background-color: #f1f3f5;
  border-radius: 10px;
  object-fit: cover;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #d4a373;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
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
  opacity: 0.75;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-16 {
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

.image-3 {
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  background-color: #f1f3f5;
  border-radius: 10px;
  object-fit: cover;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #d4a373;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  opacity: 0.75;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
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
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #8b9d77;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #d4a373;
  opacity: 0.35;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
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
  font-size: 14px;
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.3px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #d4a373;
  box-shadow: 0px 6px 16px 0px rgba(122,99,80,0.06);
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #8fb86a;
  border-radius: 10px;
  opacity: 0.18;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-6 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-25 {
  box-sizing: border-box;
  position: fixed;
  display: flex;
  flex-direction: row;
  bottom: calc(0px + env(safe-area-inset-bottom, 0px));
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 20px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  min-height: 88px;
  background-color: #faf5ef;
  border: 1px solid #d4a373;
  box-shadow: 0px -6px 18px 0px rgba(122,99,80,0.10);
}

.frame-26 {
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
  opacity: 0.8;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
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
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 28px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.5px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-1 {
  box-sizing: border-box;
  padding: 0px 24px;
  width: fit-content;
  height: 48px;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 10px;
  box-shadow: 0px 4px 12px 0px rgba(181,101,74,0.24);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
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

.button-1:hover {
  background-color: #a05a42;
  box-shadow: 0px 8px 20px 0px rgba(181,101,74,0.30);
}

.button-1:active {
  background-color: #a05a42;
  box-shadow: inset 0px 2px 4px 0px rgba(0,0,0,0.12);
}
</style>
