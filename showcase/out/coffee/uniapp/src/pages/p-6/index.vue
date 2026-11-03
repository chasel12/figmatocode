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
  <view id="page-424" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <view class="frame-3">
          <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjEuNzEiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-4">
          <text class="text-1">林小满</text>
          <text class="text-2">拾豆会员 · 累计 68 杯</text>
        </view>
      </view>
    </view>
    <view class="frame-5">
      <view class="frame-6">
        <text class="text-3">咖啡豆积分</text>
        <text class="text-4">1280</text>
        <text class="text-5">可抵扣 4 杯</text>
      </view>
      <view class="frame-7">
        <text class="text-6">优惠券</text>
        <text class="text-7">3</text>
        <text class="text-8">2 张即将过期</text>
      </view>
    </view>
    <view class="frame-8">
      <view class="frame-9">
        <text class="text-9">再来一单</text>
        <text class="text-10">全部订单</text>
      </view>
      <view class="frame-10">
        <view class="image-1 ui-image-placeholder ui-image-ph-photo-298"></view>
        <view class="frame-11">
          <text class="text-11">燕麦拿铁</text>
          <text class="text-12">大杯 · 少糖 · 热</text>
          <text class="text-13">¥32.00</text>
        </view>
        <view class="button-1">再来一单</view>
      </view>
      <view class="frame-12">
        <view class="image-2 ui-image-placeholder ui-image-ph-photo-298"></view>
        <view class="frame-13">
          <text class="text-14">冰摇柠檬美式</text>
          <text class="text-15">中杯 · 去冰 · 加柠檬片</text>
          <text class="text-16">¥28.00</text>
        </view>
        <view class="button-2">再来一单</view>
      </view>
      <view class="frame-14">
        <view class="image-3 ui-image-placeholder ui-image-ph-photo-298"></view>
        <view class="frame-15">
          <text class="text-17">海盐焦糖玛奇朵</text>
          <text class="text-18">大杯 · 标准糖 · 热</text>
          <text class="text-19">¥36.00</text>
        </view>
        <view class="button-3">再来一单</view>
      </view>
    </view>
    <view class="frame-16">
      <view class="frame-17">
        <view class="frame-18">
          <view class="frame-19">
            <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0yMCAxMGMwIDQuOTkzLTUuNTM5IDEwLjE5My03LjM5OSAxMS43OTlhMSAxIDAgMCAxLTEuMjAyIDBDOS41MzkgMjAuMTkzIDQgMTQuOTkzIDQgMTBhOCA4IDAgMCAxIDE2IDBNOSAxMGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-20">我的地址</text>
          </view>
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYWRiNWJkIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="rectangle-1"></view>
        <view class="frame-20">
          <view class="frame-21">
            <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik00IDJ2MjBsMi0xIDIgMSAyLTEgMiAxIDItMSAyIDEgMi0xIDIgMVYybC0yIDEtMi0xLTIgMS0yLTEtMiAxLTItMS0yIDFaTTE2IDhoLTZhMiAyIDAgMSAwIDAgNGg0YTIgMiAwIDEgMSAwIDRIOE0xMiAxNy41di0xMSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-21">发票抬头</text>
          </view>
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYWRiNWJkIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="rectangle-2"></view>
        <view class="frame-22">
          <view class="frame-23">
            <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik05LjkzNyAxNS41QTIgMiAwIDAgMCA4LjUgMTQuMDYzbC02LjEzNS0xLjU4MmEuNS41IDAgMCAxIDAtLjk2Mkw4LjUgOS45MzZBMiAyIDAgMCAwIDkuOTM3IDguNWwxLjU4Mi02LjEzNWEuNS41IDAgMCAxIC45NjMgMEwxNC4wNjMgOC41QTIgMiAwIDAgMCAxNS41IDkuOTM3bDYuMTM1IDEuNTgxYS41LjUgMCAwIDEgMCAuOTY0TDE1LjUgMTQuMDYzYTIgMiAwIDAgMC0xLjQzNyAxLjQzN2wtMS41ODIgNi4xMzVhLjUuNSAwIDAgMS0uOTYzIDB6TTIwIDN2NE0yMiA1aC00TTQgMTd2Mk01IDE4SDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-22">会员权益</text>
          </view>
          <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYWRiNWJkIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="rectangle-3"></view>
        <view class="frame-24">
          <view class="frame-25">
            <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYjU2NTRhIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0yIDEyYTEwIDEwIDAgMSAwIDIwIDBhMTAgMTAgMCAxIDAgLTIwIDBNOS4wOSA5YTMgMyAwIDAgMSA1LjgzIDFjMCAyLTMgMy0zIDNNMTIgMTdoLjAxIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-23">帮助中心</text>
          </view>
          <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYWRiNWJkIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="rectangle-4"></view>
        <view class="frame-26">
          <view class="frame-27">
            <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2I1NjU0YSIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMiAxMmExMCAxMCAwIDEgMCAyMCAwYTEwIDEwIDAgMSAwIC0yMCAwTTEyIDE2di00TTEyIDhoLjAxIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-24">关于我们</text>
          </view>
          <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2FkYjViZCIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
    </view>
    <view class="frame-28">
      <view class="frame-29" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2FkYjViZCIgc3Ryb2tlLXdpZHRoPSIyLjE4IiA+PHBhdGggZD0iTTEwIDJ2Mk0xNCAydjJNMTYgOGExIDEgMCAwIDEgMSAxdjhhNCA0IDAgMCAxLTQgNEg3YTQgNCAwIDAgMS00LTRWOWExIDEgMCAwIDEgMS0xaDE0YTQgNCAwIDEgMSAwIDhoLTFNNiAydjIiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-25">点单</text>
      </view>
      <view class="frame-30" @tap="switchTo('/pages/p-5/index')">
        <view class="vector-13" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEzIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2FkYjViZCIgc3Ryb2tlLXdpZHRoPSIyLjE4IiA+PHBhdGggZD0iTTQgMnYyMGwyLTEgMiAxIDItMSAyIDEgMi0xIDIgMSAyLTEgMiAxVjJsLTIgMS0yLTEtMiAxLTItMS0yIDEtMi0xLTIgMVpNMTYgOGgtNmEyIDIgMCAxIDAgMCA0aDRhMiAyIDAgMSAxIDAgNEg4TTEyIDE3LjV2LTExIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-26">订单</text>
      </view>
      <view class="frame-31">
        <view class="vector-14" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE0IiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2I1NjU0YSIgc3Ryb2tlLXdpZHRoPSIyLjE4IiA+PHBhdGggZD0iTTE5IDIxdi0yYTQgNCAwIDAgMC00LTRIOWE0IDQgMCAwIDAtNCA0djJNOCA3YTQgNCAwIDEgMCA4IDBhNCA0IDAgMSAwIC04IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-27">我的</text>
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
  padding: 24px 24px 20px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-image: linear-gradient(250deg, rgba(181, 101, 74, 0.14) 0%, rgba(250, 245, 239, 0) 100%);
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  background-color: #f1e3d5;
  border-radius: 9999px;
  border: 2px solid #d4a373;
}

.vector-1 {
  box-sizing: border-box;
  width: 28px;
  height: 28px;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 30px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.3px;
  color: #7a6350;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 0px 16px 20px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 6px 16px 0px rgba(0,0,0,0.08);
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #212529;
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
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 6px 16px 0px rgba(0,0,0,0.08);
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 29px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.4px;
  color: #212529;
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
  color: #fd7e14;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 16px 20px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-9 {
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

.text-9 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 23px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 4px 12px 0px rgba(0,0,0,0.07);
}

.image-1 {
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
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
  color: #212529;
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
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
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

.button-1 {
  box-sizing: border-box;
  padding: 6px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 9999px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 4px 12px 0px rgba(0,0,0,0.07);
}

.image-2 {
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-16 {
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

.button-2 {
  box-sizing: border-box;
  padding: 6px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 9999px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.06), 0px 4px 12px 0px rgba(0,0,0,0.07);
}

.image-3 {
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
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
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #868e96;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
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

.button-3 {
  box-sizing: border-box;
  padding: 6px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #b5654a;
  border-radius: 9999px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 19px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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

.frame-16 {
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

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05), 0px 4px 12px 0px rgba(0,0,0,0.06);
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  overflow: hidden;
}

.frame-19 {
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

.vector-2 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #f1f3f5;
  overflow: hidden;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  overflow: hidden;
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

.vector-4 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #f1f3f5;
  overflow: hidden;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  overflow: hidden;
}

.frame-23 {
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

.vector-6 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-7 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-3 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #f1f3f5;
  overflow: hidden;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  overflow: hidden;
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

.vector-8 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-9 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-4 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #f1f3f5;
  overflow: hidden;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-27 {
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

.vector-10 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  -webkit-font-smoothing: antialiased;
  color: #212529;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-11 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
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
  padding: 0px 28px;
  width: 100%;
  height: 64px;
  background-color: #ffffff;
  border: 1px solid #f1f3f5;
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

.vector-12 {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #adb5bd;
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

.vector-13 {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #adb5bd;
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

.vector-14 {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #b5654a;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
