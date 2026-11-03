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
  <view id="page-215" class="page-1">
    <view class="frame-1">
      <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Im0xNSAxOC02LTYgNi02IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
      <text class="text-1">歌单</text>
      <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIuNCIgPjxwYXRoIGQ9Ik0xMSAxMmExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwTTE4IDEyYTEgMSAwIDEgMCAyIDBhMSAxIDAgMSAwIC0yIDBNNCAxMmExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
    </view>
    <view class="frame-2">
      <view class="image-1 ui-image-placeholder ui-image-ph-hero-353"></view>
      <text class="text-2">城市夜行</text>
      <text class="text-3">深夜通勤与失眠时刻的低频合成器、冷色氛围与人声碎片，一路从写字楼开到江边。</text>
      <view class="frame-3">
        <view class="frame-4">
          <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjYTFhMWFhIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJNNiAzTDIwIDEyTDYgMjFMNiAzWiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-4">128 万次播放</text>
        </view>
        <view class="rectangle-1"></view>
        <text class="text-5">42 首 · 2 小时 16 分</text>
      </view>
    </view>
    <view class="frame-5">
      <view class="button-1" @tap="go('/pages/p-2/index')">播放全部</view>
      <view class="frame-6">
        <view class="frame-7">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTkgMTRjMS40OS0xLjQ2IDMtMy4yMSAzLTUuNUE1LjUgNS41IDAgMCAwIDE2LjUgM2MtMS43NiAwLTMgLjUtNC41IDItMS41LTEuNS0yLjc0LTItNC41LTJBNS41IDUuNSAwIDAgMCAyIDguNWMwIDIuMyAxLjUgNC4wNSAzIDUuNWw3IDdaIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-6">收藏 8.4k</text>
        </view>
        <view class="frame-8">
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNE03IDEwTDEyIDE1TDE3IDEwTTEyIDE1TDEyIDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-7">下载</text>
        </view>
        <view class="frame-9">
          <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjZTRlNGU3IiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTUgNWEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTMgMTJhMyAzIDAgMSAwIDYgMGEzIDMgMCAxIDAgLTYgME0xNSAxOWEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwTTguNTkgMTMuNTFMMTUuNDIgMTcuNDlNMTUuNDEgNi41MUw4LjU5IDEwLjQ5IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-8">分享</text>
        </view>
      </view>
    </view>
    <view class="frame-10">
      <view class="frame-11">
        <text class="text-9">TRACKS</text>
        <text class="text-10">共 42 首</text>
      </view>
      <view class="rectangle-2"></view>
      <view class="frame-12">
        <text class="text-11">01</text>
        <view class="frame-13">
          <text class="text-12">霓虹折旧</text>
          <text class="text-13">回声 / 林晚</text>
        </view>
        <text class="text-14">3:42</text>
      </view>
      <view class="frame-14">
        <text class="text-15">02</text>
        <view class="frame-15">
          <text class="text-16">江风倒带</text>
          <text class="text-17">回声</text>
        </view>
        <text class="text-18">4:05</text>
      </view>
      <view class="frame-16">
        <text class="text-19">03</text>
        <view class="frame-17">
          <text class="text-20">凌晨三点的便利店</text>
          <text class="text-21">回声 / 陈默</text>
        </view>
        <text class="text-22">2:58</text>
      </view>
      <view class="frame-18">
        <text class="text-23">04</text>
        <view class="frame-19">
          <text class="text-24">地铁末班车</text>
          <text class="text-25">回声</text>
        </view>
        <text class="text-26">3:26</text>
      </view>
      <view class="frame-20">
        <text class="text-27">05</text>
        <view class="frame-21">
          <text class="text-28">雾中高架桥</text>
          <text class="text-29">回声 / 白鹭</text>
        </view>
        <text class="text-30">5:11</text>
      </view>
      <view class="frame-22">
        <text class="text-31">06</text>
        <view class="frame-23">
          <text class="text-32">回声未读</text>
          <text class="text-33">回声</text>
        </view>
        <text class="text-34">3:19</text>
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
  padding: 0px 0px 24px 0px;
  width: 100%;
  min-height: max(812px, 100vh);
  background-color: #0a0a0b;
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
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.2px;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-2 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.frame-2 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 16px 24px 24px 24px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-image: radial-gradient(ellipse at 50% 0%, rgba(94, 106, 210, 0.22) 0%, transparent 66%);
}

.image-1 {
  box-sizing: border-box;
  width: 196px;
  height: 196px;
  background-color: #141418;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #ffffff1a;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 32px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.6px;
  color: #ffffff;
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
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.1px;
  color: #a1a1aa;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-3 {
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

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-3 {
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
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 3px;
  height: 3px;
  background-color: #52525b;
  border-radius: 999px;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #a1a1aa;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.button-1 {
  box-sizing: border-box;
  padding: 10px 12px;
  width: 100%;
  height: 48px;
  min-width: 82px;
  background-image: linear-gradient(180deg, #5e6ad2 0%, #8b5cf6 100%);
  border-radius: 8px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
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

.frame-6 {
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

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 0px 12px;
  width: fit-content;
  height: 32px;
  flex: 0 0 auto;
  background-color: #ffffff08;
  border-radius: 8px;
  border: 1px solid #ffffff1a;
}

.vector-4 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-6 {
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

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 0px 12px;
  width: fit-content;
  height: 32px;
  flex: 0 0 auto;
  background-color: #ffffff08;
  border-radius: 8px;
  border: 1px solid #ffffff1a;
}

.vector-5 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-7 {
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
  flex-direction: row;
  gap: 6px;
  align-items: center;
  padding: 0px 12px;
  width: fit-content;
  height: 32px;
  flex: 0 0 auto;
  background-color: #ffffff08;
  border-radius: 8px;
  border: 1px solid #ffffff1a;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.text-8 {
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

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  margin: 24px 0px 0px 0px;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 0px 0px 8px 0px;
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
  letter-spacing: 1.8px;
  color: #71717a;
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
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-2 {
  box-sizing: border-box;
  width: 100%;
  height: 1px;
  background-color: #ffffff14;
}

.frame-12 {
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
}

.text-11 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
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

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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
  color: #71717a;
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
  color: #71717a;
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
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-15 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
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

.text-16 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-17 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
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
  color: #71717a;
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
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-19 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
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

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-22 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-18 {
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
}

.text-23 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-19 {
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

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #71717a;
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
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
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
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-27 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-21 {
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
  color: #ffffff;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #71717a;
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
  padding: 12px 0px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.text-31 {
  box-sizing: border-box;
  width: 20px;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.4px;
  color: #52525b;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-23 {
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

.text-32 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #ffffff;
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
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #71717a;
  white-space: pre-wrap;
  word-break: break-word;
}

.button-1:hover {
  opacity: 0.9;
}

.button-1:active {
  opacity: 0.8;
}
</style>
