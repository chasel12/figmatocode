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
  <view id="page-370" class="page-1">
    <view class="frame-1">
      <view class="frame-2">
        <text class="text-1">搜索</text>
        <view class="frame-3">
          <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNNCAzaDNhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMSAtMSAxaC0zYTEgMSAwIDAgMSAtMSAtMXYtM2ExIDEgMCAwIDEgMSAtMVpNMTcgM2gzYTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEgLTEgMWgtM2ExIDEgMCAwIDEgLTEgLTF2LTNhMSAxIDAgMCAxIDEgLTFaTTQgMTZoM2ExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxIC0xIDFoLTNhMSAxIDAgMCAxIC0xIC0xdi0zYTEgMSAwIDAgMSAxIC0xWk0yMSAxNmgtM2EyIDIgMCAwIDAtMiAydjNNMjEgMjF2LjAxTTEyIDd2M2EyIDIgMCAwIDEtMiAySDdNMyAxMmguMDFNMTIgM2guMDFNMTIgMTZ2LjAxTTE2IDEyaDFNMjEgMTJ2LjAxTTEyIDIxdi0xIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
      <view class="frame-4">
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMyAxMWE4IDggMCAxIDAgMTYgMGE4IDggMCAxIDAgLTE2IDBtMjEgMjEtNC4zLTQuMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-2">回声</text>
        <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNjA1ZGZmIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTIgMmEzIDMgMCAwIDAtMyAzdjdhMyAzIDAgMCAwIDYgMFY1YTMgMyAwIDAgMC0zLTNaTTE5IDEwdjJhNyA3IDAgMCAxLTE0IDB2LTJNMTIgMTlMMTIgMjIiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-5">
      <view class="frame-6">
        <view class="frame-7">
          <text class="text-3">热搜</text>
          <view class="frame-8">
            <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNMyAxMmE5IDkgMCAwIDEgOS05IDkuNzUgOS43NSAwIDAgMSA2Ljc0IDIuNzRMMjEgOE0yMSAzdjVoLTVNMjEgMTJhOSA5IDAgMCAxLTkgOSA5Ljc1IDkuNzUgMCAwIDEtNi43NC0yLjc0TDMgMTZNOCAxNkgzdjUiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            <text class="text-4">换一批</text>
          </view>
        </view>
        <view class="frame-9">
          <view class="frame-10">
            <view class="frame-11">
              <text class="text-5">1</text>
              <text class="text-6">夜航西飞</text>
            </view>
            <view class="frame-12">
              <text class="text-7">2</text>
              <text class="text-8">回声计划</text>
            </view>
          </view>
          <view class="frame-13">
            <view class="frame-14">
              <text class="text-9">3</text>
              <text class="text-10">钢铁森林</text>
            </view>
            <view class="frame-15">
              <text class="text-11">4</text>
              <text class="text-12">雨季不再来</text>
            </view>
          </view>
          <view class="frame-16">
            <view class="frame-17">
              <text class="text-13">5</text>
              <text class="text-14">北方旅人</text>
            </view>
            <view class="frame-18">
              <text class="text-15">6</text>
              <text class="text-16">深海回音</text>
            </view>
          </view>
          <view class="frame-19">
            <view class="frame-20">
              <text class="text-17">7</text>
              <text class="text-18">午夜列车</text>
            </view>
          </view>
        </view>
      </view>
      <view class="rectangle-1"></view>
      <view class="frame-21">
        <view class="frame-22">
          <text class="text-19">搜索历史</text>
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMyA2aDE4TTE5IDZ2MTRjMCAxLTEgMi0yIDJIN2MtMSAwLTItMS0yLTJWNk04IDZWNGMwLTEgMS0yIDItMmg0YzEgMCAyIDEgMiAydjJNMTAgMTFMMTAgMTdNMTQgMTFMMTQgMTciIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-23">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMiAxMmExMCAxMCAwIDEgMCAyMCAwYTEwIDEwIDAgMSAwIC0yMCAwTTEyIDZMMTIgMTJMMTYgMTQiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-20">夜航西飞 现场版</text>
          <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-24">
          <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMiAxMmExMCAxMCAwIDEgMCAyMCAwYTEwIDEwIDAgMSAwIC0yMCAwTTEyIDZMMTIgMTJMMTYgMTQiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-21">回声 电台节目</text>
          <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-25">
          <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTIgMTJhMTAgMTAgMCAxIDAgMjAgMGExMCAxMCAwIDEgMCAtMjAgME0xMiA2TDEyIDEyTDE2IDE0IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-22">钢铁森林 陈默</text>
          <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
        <view class="frame-26">
          <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTIgMTJhMTAgMTAgMCAxIDAgMjAgMGExMCAxMCAwIDEgMCAtMjAgME0xMiA2TDEyIDEyTDE2IDE0IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-23">深海回音 原声带</text>
          <view class="vector-13" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEzIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
      <view class="rectangle-2"></view>
      <view class="frame-27">
        <view class="frame-28">
          <text class="text-24">猜你想听</text>
          <view class="frame-29">
            <text class="text-25">全部</text>
            <view class="vector-14" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE0IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSI0IiA+PHBhdGggZD0ibTkgMTggNi02LTYtNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
        </view>
        <view class="frame-30">
          <view class="frame-31">
            <view class="image-1 ui-image-placeholder ui-image-ph-hero-276"></view>
            <text class="text-26">夜航西飞</text>
            <text class="text-27">陈默 · 民谣</text>
          </view>
          <view class="frame-32">
            <view class="image-2 ui-image-placeholder ui-image-ph-hero-93"></view>
            <text class="text-28">钢铁森林</text>
            <text class="text-29">回声乐队 · 摇滚</text>
          </view>
          <view class="frame-33">
            <view class="image-3 ui-image-placeholder ui-image-ph-hero-274"></view>
            <text class="text-30">深海回音</text>
            <text class="text-31">苏黎 · 电子</text>
          </view>
        </view>
      </view>
    </view>
    <view class="frame-34">
      <view class="frame-35" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-15" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE1IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJtMTYuMjQgNy43Ni0xLjgwNCA1LjQxMWEyIDIgMCAwIDEtMS4yNjUgMS4yNjVMNy43NiAxNi4yNGwxLjgwNC01LjQxMWEyIDIgMCAwIDEgMS4yNjUtMS4yNjV6TTIgMTJhMTAgMTAgMCAxIDAgMjAgMGExMCAxMCAwIDEgMCAtMjAgMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-32">发现</text>
      </view>
      <view class="frame-36">
        <view class="vector-16" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzYwNWRmZiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMyAxMWE4IDggMCAxIDAgMTYgMGE4IDggMCAxIDAgLTE2IDBtMjEgMjEtNC4zLTQuMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-33">搜索</text>
      </view>
      <view class="frame-37" @tap="switchTo('/pages/p-5/index')">
        <view class="vector-17" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE3IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2U0ZTRlNyIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNOSAxOFY1bDEyLTJ2MTNNMyAxOGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTE1IDE2YTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-34">我的音乐</text>
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
  background-color: #1d232a;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.frame-1 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 16px 16px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #1d232a;
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
  letter-spacing: -0.6px;
  color: #ecf9ff;
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
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #15191e;
  border-radius: 8px;
}

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  padding: 0px 12px;
  width: 100%;
  height: 44px;
  background-color: #15191e;
  border-radius: 12px;
  border: 1px solid #15191e;
  box-shadow: inset 0px 1px 2px 0px rgba(0,0,0,0.4);
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-2 {
  box-sizing: border-box;
  min-width: 30px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 16px 96px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-6 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-7 {
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
  letter-spacing: 1.4px;
  color: #e4e4e7;
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
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-4 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-4 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
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
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #605dff;
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
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-12 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.text-7 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #605dff;
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
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
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
  color: #605dff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-10 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.text-11 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
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
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-17 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.text-15 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
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
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-20 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #191e24;
  border-radius: 8px;
  border: 1px solid #15191e;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-18 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #15191e;
}

.frame-21 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 0px 4px 0px;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.4px;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-23 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #15191e;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-20 {
  box-sizing: border-box;
  min-width: 108px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-7 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #15191e;
}

.vector-8 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-21 {
  box-sizing: border-box;
  min-width: 94px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-9 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #15191e;
}

.vector-10 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-22 {
  box-sizing: border-box;
  min-width: 94px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-11 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-26 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #15191e;
}

.vector-12 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-23 {
  box-sizing: border-box;
  min-width: 108px;
  height: fit-content;
  flex: 1 1 0;
  flex-grow: 1;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-13 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #15191e;
}

.frame-27 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-28 {
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

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.2px;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
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
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-14 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.frame-30 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-31 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.image-1 {
  box-sizing: border-box;
  width: 100%;
  height: 96px;
  background-color: #15191e;
  border-radius: 12px;
  object-fit: cover;
}

.text-26 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-32 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.image-2 {
  box-sizing: border-box;
  width: 100%;
  height: 96px;
  background-color: #15191e;
  border-radius: 12px;
  object-fit: cover;
}

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-29 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
}

.image-3 {
  box-sizing: border-box;
  width: 100%;
  height: 96px;
  background-color: #15191e;
  border-radius: 12px;
  object-fit: cover;
}

.text-30 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ecf9ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-31 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-34 {
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
  height: fit-content;
  flex: 0 0 auto;
  min-height: 64px;
  background-color: #191e24;
  border: 1px solid #15191e;
}

.frame-35 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 100%;
}

.vector-15 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-32 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-36 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 100%;
}

.vector-16 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-33 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #605dff;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-37 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 100%;
}

.vector-17 {
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
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #e4e4e7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
