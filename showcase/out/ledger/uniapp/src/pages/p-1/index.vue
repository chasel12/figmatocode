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
      <view class="frame-2">
        <text class="text-1">11 月</text>
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
      <text class="text-2">青柠账本</text>
    </view>
    <view class="frame-3">
      <text class="text-3">本月支出</text>
      <text class="text-4">¥4,286.50</text>
      <view class="frame-4"></view>
      <view class="frame-5">
        <view class="frame-6">
          <text class="text-5">收入</text>
          <text class="text-6">¥12,800.00</text>
        </view>
        <view class="frame-7">
          <text class="text-7">结余</text>
          <text class="text-8">¥8,513.50</text>
        </view>
      </view>
    </view>
    <view class="frame-8">
      <view class="frame-9">
        <text class="text-9">本月预算</text>
        <text class="text-10">71%</text>
      </view>
      <text class="text-11">已用 ¥4,286.50 / 总额 ¥6,000.00</text>
      <view class="frame-10">
        <view class="rectangle-1"></view>
      </view>
      <view class="frame-11">
        <view class="rectangle-2"></view>
      </view>
    </view>
    <view class="frame-12">
      <view class="frame-13" @tap="switchTo('/pages/p-2/index')">
        <text class="text-12">最近三笔</text>
        <text class="text-13">全部明细</text>
      </view>
      <view class="frame-14">
        <view class="frame-15">
          <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMyAydjdjMCAxLjEuOSAyIDIgMmg0YTIgMiAwIDAgMCAyLTJWMk03IDJ2MjBNMjEgMTVWMmE1IDUgMCAwIDAtNSA1djZjMCAxLjEuOSAyIDIgMmgzWm0wIDB2NyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-16">
          <text class="text-14">餐饮</text>
          <text class="text-15">楼下面馆</text>
        </view>
        <view class="frame-17">
          <text class="text-16">¥38.00</text>
          <text class="text-17">11-28</text>
        </view>
      </view>
      <view class="frame-18">
        <view class="frame-19">
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOCA2djZNMTUgNnY2TTIgMTJoMTkuNk0xOCAxOGgzcy41LTEuNy44LTIuOGMuMS0uNC4yLS44LjItMS4yIDAtLjQtLjEtLjgtLjItMS4ybC0xLjQtNUMyMC4xIDYuOCAxOS4xIDYgMTggNkg0YTIgMiAwIDAgMC0yIDJ2MTBoM001IDE4YTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwIC00IDBNOSAxOGg1TTE0IDE4YTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwIC00IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-20">
          <text class="text-18">交通</text>
          <text class="text-19">地铁2号线</text>
        </view>
        <view class="frame-21">
          <text class="text-20">¥6.00</text>
          <text class="text-21">11-28</text>
        </view>
      </view>
      <view class="frame-22">
        <view class="frame-23">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTAgMnYyTTE0IDJ2Mk0xNiA4YTEgMSAwIDAgMSAxIDF2OGE0IDQgMCAwIDEtNCA0SDdhNCA0IDAgMCAxLTQtNFY5YTEgMSAwIDAgMSAxLTFoMTRhNCA0IDAgMSAxIDAgOGgtMU02IDJ2MiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-24">
          <text class="text-22">购物</text>
          <text class="text-23">咖啡续命</text>
        </view>
        <view class="frame-25">
          <text class="text-24">¥28.00</text>
          <text class="text-25">11-27</text>
        </view>
      </view>
      <view class="frame-26">
        <view class="frame-27">
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTEgMjEuNzNhMiAyIDAgMCAwIDIgMGw3LTRBMiAyIDAgMCAwIDIxIDE2VjhhMiAyIDAgMCAwLTEtMS43M2wtNy00YTIgMiAwIDAgMC0yIDBsLTcgNEEyIDIgMCAwIDAgMyA4djhhMiAyIDAgMCAwIDEgMS43M3pNMTIgMjJWMTJtMy4zIDcgNy43MDMgNC43MzRhMiAyIDAgMCAwIDEuOTk0IDBMMjAuNyA3bTcuNSA0LjI3IDkgNS4xNSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-28">
          <text class="text-26">居家</text>
          <text class="text-27">宜家收纳盒</text>
        </view>
        <view class="frame-29">
          <text class="text-28">¥129.00</text>
          <text class="text-29">11-26</text>
        </view>
      </view>
      <view class="frame-30">
        <view class="frame-31">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMiA5YTMgMyAwIDAgMSAwIDZ2MmEyIDIgMCAwIDAgMiAyaDE2YTIgMiAwIDAgMCAyLTJ2LTJhMyAzIDAgMCAxIDAtNlY3YTIgMiAwIDAgMC0yLTJINGEyIDIgMCAwIDAtMiAyWk0xMyA1djJNMTMgMTd2Mk0xMyAxMXYyIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-32">
          <text class="text-30">娱乐</text>
          <text class="text-31">电影票两张</text>
        </view>
        <view class="frame-33">
          <text class="text-32">¥76.00</text>
          <text class="text-33">11-26</text>
        </view>
      </view>
    </view>
    <view class="frame-34" @tap="go('/pages/p-3/index')">
      <view class="button-1">记一笔</view>
    </view>
    <view class="frame-35">
      <view class="frame-36">
        <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik00IDNoNWExIDEgMCAwIDEgMSAxdjdhMSAxIDAgMCAxIC0xIDFoLTVhMSAxIDAgMCAxIC0xIC0xdi03YTEgMSAwIDAgMSAxIC0xWk0xNSAzaDVhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtM2ExIDEgMCAwIDEgMSAtMVpNMTUgMTJoNWExIDEgMCAwIDEgMSAxdjdhMSAxIDAgMCAxIC0xIDFoLTVhMSAxIDAgMCAxIC0xIC0xdi03YTEgMSAwIDAgMSAxIC0xWk00IDE2aDVhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtM2ExIDEgMCAwIDEgMSAtMVoiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-34">概览</text>
      </view>
      <view class="frame-37" @tap="switchTo('/pages/p-2/index')">
        <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0zIDEyaC4wMU0zIDE4aC4wMU0zIDZoLjAxTTggMTJoMTNNOCAxOGgxM004IDZoMTMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-35">明细</text>
      </view>
      <view class="frame-38" @tap="switchTo('/pages/p-6/index')">
        <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xOSAyMXYtMmE0IDQgMCAwIDAtNC00SDlhNCA0IDAgMCAwLTQgNHYyTTggN2E0IDQgMCAxIDAgOCAwYTQgNCAwIDEgMCAtOCAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-36">我的</text>
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
  background-color: #ffffff;
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
  padding: 12px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  padding: 4px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.text-1 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-1 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  margin: 12px 16px 0px 16px;
  background-color: #f8fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.2px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 33px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.6px;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 1px;
  background-color: #e2e8f0;
}

.frame-5 {
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

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-6 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.8px;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-8 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  margin: 12px 16px 0px 16px;
  background-color: #FFFFFF;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.5px;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 8px;
  background-color: #eef2f0;
  border-radius: 4px;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 260px;
  height: 100%;
  background-color: #0f5132;
  border-radius: 4px;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  height: 8px;
  background-color: #eef2f0;
  border-radius: 4px;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 180px;
  height: 100%;
  background-color: #2f7d5b;
  border-radius: 4px;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  margin: 16px 16px 0px 16px;
}

.frame-13 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 4px 4px 4px;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-13 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-16 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  width: fit-content;
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
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
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
  padding: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-19 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-21 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
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
  padding: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-23 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-25 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
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
  padding: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
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
  padding: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-32 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-31 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-32 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-33 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #94a3b8;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-34 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  margin: 16px 16px 0px 16px;
}

.button-1 {
  box-sizing: border-box;
  padding: 0px 12px;
  width: 100%;
  height: 40px;
  min-width: 68px;
  background-color: #0f5132;
  border-radius: 4px;
  box-shadow: 0px 2px 6px 0px rgba(0,0,0,0.12);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #FFFFFF;
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

.frame-35 {
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
  height: 64px;
  background-color: #FFFFFF;
  border: 1px solid #e2e8f0;
}

.frame-36 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-7 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-34 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 500;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-37 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.text-35 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-38 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-9 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-36 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 14px;
  -webkit-font-smoothing: antialiased;
  color: #64748b;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-1:hover {
  opacity: 0.92;
}

.button-1:active {
  opacity: 0.82;
}
</style>
