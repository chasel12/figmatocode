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
  <view id="page-88" class="page-1">
    <view class="frame-1">
      <text class="text-1">青柠账本</text>
      <view class="frame-2">
        <view class="vector-1" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMyAxMWE4IDggMCAxIDAgMTYgMGE4IDggMCAxIDAgLTE2IDBtMjEgMjEtNC4zLTQuMyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <view class="vector-2" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTIiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMjEgNEwxNCA0TTEwIDRMMyA0TTIxIDEyTDEyIDEyTTggMTJMMyAxMk0yMSAyMEwxNiAyME0xMiAyMEwzIDIwTTE0IDJMMTQgNk04IDEwTDggMTRNMTYgMThMMTYgMjIiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
      </view>
    </view>
    <view class="frame-3">
      <view class="frame-4">
        <view class="frame-5">
          <view class="frame-6">
            <text class="text-2">11 月</text>
            <view class="vector-3" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTMiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <text class="text-3">本月支出合计</text>
          <text class="text-4">¥4,286.50</text>
        </view>
        <view class="frame-7" @tap="switchTo('/pages/p-5/index')">
          <view class="vector-4" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTQiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMuNDMiID48cGF0aCBkPSJNMyAzdjE2YTIgMiAwIDAgMCAyIDJoMTZNNyAxNmg4TTcgMTFoMTJNNyA2aDMiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          <text class="text-5">统计</text>
        </view>
      </view>
      <view class="frame-8">
        <view class="frame-9">
          <text class="text-6">本月收入</text>
          <text class="text-7">+¥8,650.00</text>
        </view>
        <view class="rectangle-1"></view>
        <view class="frame-10">
          <text class="text-8">本月结余</text>
          <text class="text-9">¥4,363.50</text>
        </view>
      </view>
    </view>
    <view class="frame-11">
      <view class="frame-12">
        <text class="text-10">ALL LEDGER</text>
        <view class="frame-13">
          <text class="text-11">按时间倒序</text>
          <view class="vector-5" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTUiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjNmI3YTcyIiBzdHJva2Utd2lkdGg9IjQiID48cGF0aCBkPSJtMTggMTUtNi02LTYgNiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        </view>
      </view>
      <view class="frame-14">
        <text class="text-12">11-28 周五</text>
        <text class="text-13">支出 ¥44.00</text>
      </view>
      <view class="frame-15">
        <view class="frame-16">
          <view class="frame-17">
            <view class="frame-18">
              <view class="vector-6" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMyAydjdjMCAxLjEuOSAyIDIgMmg0YTIgMiAwIDAgMCAyLTJWMk03IDJ2MjBNMjEgMTVWMmE1IDUgMCAwIDAtNSA1djZjMCAxLjEuOSAyIDIgMmgzWm0wIDB2NyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-19">
              <text class="text-14">餐饮</text>
              <text class="text-15">楼下面馆 · 11-28</text>
            </view>
          </view>
          <text class="text-16">-¥38.00</text>
        </view>
        <view class="frame-20">
          <view class="frame-21">
            <view class="frame-22">
              <view class="vector-7" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNOCA2djZNMTUgNnY2TTIgMTJoMTkuNk0xOCAxOGgzcy41LTEuNy44LTIuOGMuMS0uNC4yLS44LjItMS4yIDAtLjQtLjEtLjgtLjItMS4ybC0xLjQtNUMyMC4xIDYuOCAxOS4xIDYgMTggNkg0YTIgMiAwIDAgMC0yIDJ2MTBoM001IDE4YTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwIC00IDBNOSAxOGg1TTE0IDE4YTIgMiAwIDEgMCA0IDBhMiAyIDAgMSAwIC00IDAiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-23">
              <text class="text-17">交通</text>
              <text class="text-18">地铁2号线 · 11-28</text>
            </view>
          </view>
          <text class="text-19">-¥6.00</text>
        </view>
      </view>
      <view class="frame-24">
        <text class="text-20">11-27 周四</text>
        <text class="text-21">支出 ¥157.00</text>
      </view>
      <view class="frame-25">
        <view class="frame-26">
          <view class="frame-27">
            <view class="frame-28">
              <view class="vector-8" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTAgMnYyTTE0IDJ2Mk0xNiA4YTEgMSAwIDAgMSAxIDF2OGE0IDQgMCAwIDEtNCA0SDdhNCA0IDAgMCAxLTQtNFY5YTEgMSAwIDAgMSAxLTFoMTRhNCA0IDAgMSAxIDAgOGgtMU02IDJ2MiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-29">
              <text class="text-22">购物</text>
              <text class="text-23">咖啡续命 · 11-27</text>
            </view>
          </view>
          <text class="text-24">-¥28.00</text>
        </view>
        <view class="frame-30">
          <view class="frame-31">
            <view class="frame-32">
              <view class="vector-9" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTkiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMGY1MTMyIiBzdHJva2Utd2lkdGg9IjMiID48cGF0aCBkPSJNMTEgMjEuNzNhMiAyIDAgMCAwIDIgMGw3LTRBMiAyIDAgMCAwIDIxIDE2VjhhMiAyIDAgMCAwLTEtMS43M2wtNy00YTIgMiAwIDAgMC0yIDBsLTcgNEEyIDIgMCAwIDAgMyA4djhhMiAyIDAgMCAwIDEgMS43M3pNMTIgMjJWMTJtMy4zIDcgNy43MDMgNC43MzRhMiAyIDAgMCAwIDEuOTk0IDBMMjAuNyA3bTcuNSA0LjI3IDkgNS4xNSIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-33">
              <text class="text-25">居家</text>
              <text class="text-26">宜家收纳盒 · 11-27</text>
            </view>
          </view>
          <text class="text-27">-¥129.00</text>
        </view>
      </view>
      <view class="frame-34">
        <text class="text-28">11-26 周三</text>
        <text class="text-29">支出 ¥121.50</text>
      </view>
      <view class="frame-35">
        <view class="frame-36">
          <view class="frame-37">
            <view class="frame-38">
              <view class="vector-10" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEwIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTIgOWEzIDMgMCAwIDEgMCA2djJhMiAyIDAgMCAwIDIgMmgxNmEyIDIgMCAwIDAgMi0ydi0yYTMgMyAwIDAgMSAwLTZWN2EyIDIgMCAwIDAtMi0ySDRhMiAyIDAgMCAwLTIgMlpNMTMgNXYyTTEzIDE3djJNMTMgMTF2MiIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-39">
              <text class="text-30">娱乐</text>
              <text class="text-31">电影票两张 · 11-26</text>
            </view>
          </view>
          <text class="text-32">-¥76.00</text>
        </view>
        <view class="frame-40">
          <view class="frame-41">
            <view class="frame-42">
              <view class="vector-11" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTExIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0ibTEwLjUgMjAuNSAxMC0xMGE0Ljk1IDQuOTUgMCAxIDAtNy03bC0xMCAxMGE0Ljk1IDQuOTUgMCAxIDAgNyA3Wm04LjUgOC41IDcgNyIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-43">
              <text class="text-33">医疗</text>
              <text class="text-34">感冒药 · 11-26</text>
            </view>
          </view>
          <text class="text-35">-¥45.50</text>
        </view>
      </view>
      <view class="frame-44">
        <text class="text-36">11-25 周二</text>
        <text class="text-37">支出 ¥299.00</text>
      </view>
      <view class="frame-45">
        <view class="frame-46">
          <view class="frame-47">
            <view class="frame-48">
              <view class="vector-12" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEyIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTEyIDd2MTRNMyAxOGExIDEgMCAwIDEtMS0xVjRhMSAxIDAgMCAxIDEtMWg1YTQgNCAwIDAgMSA0IDQgNCA0IDAgMCAxIDQtNGg1YTEgMSAwIDAgMSAxIDF2MTNhMSAxIDAgMCAxLTEgMWgtNmEzIDMgMCAwIDAtMyAzIDMgMyAwIDAgMC0zLTN6IiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-49">
              <text class="text-38">学习</text>
              <text class="text-39">kindle电子书 · 11-25</text>
            </view>
          </view>
          <text class="text-40">-¥99.00</text>
        </view>
        <view class="frame-50">
          <view class="frame-51">
            <view class="frame-52">
              <view class="vector-13" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTEzIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTQgOGgxNmExIDEgMCAwIDEgMSAxdjJhMSAxIDAgMCAxIC0xIDFoLTE2YTEgMSAwIDAgMSAtMSAtMXYtMmExIDEgMCAwIDEgMSAtMVpNMTIgOHYxM00xOSAxMnY3YTIgMiAwIDAgMS0yIDJIN2EyIDIgMCAwIDEtMi0ydi03TTcuNSA4YTIuNSAyLjUgMCAwIDEgMC01QTQuOCA4IDAgMCAxIDEyIDhhNC44IDggMCAwIDEgNC41LTUgMi41IDIuNSAwIDAgMSAwIDUiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-53">
              <text class="text-41">人情</text>
              <text class="text-42">给妈妈买围巾 · 11-25</text>
            </view>
          </view>
          <text class="text-43">-¥299.00</text>
        </view>
      </view>
      <view class="frame-54">
        <text class="text-44">11-24 周一</text>
        <text class="text-45">支出 ¥23.00</text>
      </view>
      <view class="frame-55">
        <view class="frame-56">
          <view class="frame-57">
            <view class="frame-58">
              <view class="vector-14" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTE5IDE3aDJjLjYgMCAxLS40IDEtMXYtM2MwLS45LS43LTEuNy0xLjUtMS45QzE4LjcgMTAuNiAxNiAxMCAxNiAxMHMtMS4zLTEuNC0yLjItMi4zYy0uNS0uNC0xLjEtLjctMS44LS43SDVjLS42IDAtMS4xLjQtMS40LjlsLTEuNCAyLjlBMy43IDMuNyAwIDAgMCAyIDEydjRjMCAuNi40IDEgMSAxaDJNNSAxN2EyIDIgMCAxIDAgNCAwYTIgMiAwIDEgMCAtNCAwTTkgMTdoNk0xNSAxN2EyIDIgMCAxIDAgNCAwYTIgMiAwIDEgMCAtNCAwIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
            </view>
            <view class="frame-59">
              <text class="text-46">其他</text>
              <text class="text-47">打车回家 · 11-24</text>
            </view>
          </view>
          <text class="text-48">-¥23.00</text>
        </view>
      </view>
      <view class="frame-60">
        <view class="frame-61">
          <view class="frame-62">
            <view class="vector-15" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE1IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIzIiA+PHBhdGggZD0iTTQgNmgxNmEyIDIgMCAwIDEgMiAydjhhMiAyIDAgMCAxIC0yIDJoLTE2YTIgMiAwIDAgMSAtMiAtMnYtOGEyIDIgMCAwIDEgMiAtMlpNMTAgMTJhMiAyIDAgMSAwIDQgMGEyIDIgMCAxIDAgLTQgME02IDEyaC4wMU0xOCAxMmguMDEiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
          </view>
          <view class="frame-63">
            <text class="text-49">工资</text>
            <text class="text-50">11 月工资到账 · 11-24</text>
          </view>
        </view>
        <text class="text-51">+¥8,650.00</text>
      </view>
    </view>
    <view class="frame-64">
      <view class="frame-65" @tap="switchTo('/pages/p-1/index')">
        <view class="vector-16" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNNCAzaDVhMSAxIDAgMCAxIDEgMXY3YTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtN2ExIDEgMCAwIDEgMSAtMVpNMTUgM2g1YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEgLTEgMWgtNWExIDEgMCAwIDEgLTEgLTF2LTNhMSAxIDAgMCAxIDEgLTFaTTE1IDEyaDVhMSAxIDAgMCAxIDEgMXY3YTEgMSAwIDAgMSAtMSAxaC01YTEgMSAwIDAgMSAtMSAtMXYtN2ExIDEgMCAwIDEgMSAtMVpNNCAxNmg1YTEgMSAwIDAgMSAxIDF2M2ExIDEgMCAwIDEgLTEgMWgtNWExIDEgMCAwIDEgLTEgLTF2LTNhMSAxIDAgMCAxIDEgLTFaIiAvPjwvc3ZnPg==');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-52">概览</text>
      </view>
      <view class="frame-66">
        <view class="vector-17" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE3IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzBmNTEzMiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNNCAydjIwbDItMSAyIDEgMi0xIDIgMSAyLTEgMiAxIDItMSAyIDFWMmwtMiAxLTItMS0yIDEtMi0xLTIgMS0yLTEtMiAxWk0xNiA4aC02YTIgMiAwIDEgMCAwIDRoNGEyIDIgMCAxIDEgMCA0SDhNMTIgMTcuNXYtMTEiIC8+PC9zdmc+');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-53">明细</text>
      </view>
      <view class="frame-67" @tap="switchTo('/pages/p-6/index')">
        <view class="vector-18" style="background-image:url('data:image/svg+xml;base64,PHN2ZyBjbGFzcz0idmVjdG9yLTE4IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iIzZiN2E3MiIgc3Ryb2tlLXdpZHRoPSIyLjQiID48cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2Mk04IDdhNCA0IDAgMSAwIDggMGE0IDQgMCAxIDAgLTggMCIgLz48L3N2Zz4=');background-size:100% 100%;background-repeat:no-repeat;"></view>
        <text class="text-54">我的</text>
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
  padding: 0px 16px;
  width: 100%;
  height: 48px;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
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
  letter-spacing: -0.2px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-2 {
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

.vector-1 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.vector-2 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-3 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
}

.frame-4 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-5 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  align-items: center;
  padding: 4px 8px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #e4e8e6;
}

.text-2 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-3 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.text-3 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.025em;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
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
  letter-spacing: -0.8px;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-7 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
  padding: 6px 12px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #eef2f0;
  border-radius: 6px;
}

.vector-4 {
  box-sizing: border-box;
  width: 14px;
  height: 14px;
}

.text-5 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-8 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: stretch;
  overflow: hidden;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e8e6;
}

.frame-9 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
  overflow: hidden;
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
  letter-spacing: 0.025em;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.rectangle-1 {
  box-sizing: border-box;
  width: 1px;
  height: 80px;
  background-color: #e4e8e6;
  overflow: hidden;
}

.frame-10 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  width: fit-content;
  height: 100%;
  flex: 0 0 auto;
  flex-grow: 1;
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
  letter-spacing: 0.025em;
  color: #6b7a72;
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
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-11 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  padding: 8px 16px;
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
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 1.6px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
  text-transform: uppercase;
}

.frame-13 {
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.vector-5 {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.frame-14 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border: 1px solid #e4e8e6;
}

.text-12 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #6b7a72;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-15 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-16 {
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
  border: 1px solid #e4e8e6;
}

.frame-17 {
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

.frame-18 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-6 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-19 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-14 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  color: #6b7a72;
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
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-20 {
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
  border: 1px solid #e4e8e6;
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

.frame-22 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-7 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-23 {
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
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  color: #6b7a72;
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
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-24 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border: 1px solid #e4e8e6;
}

.text-20 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #6b7a72;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-25 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-26 {
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
  border: 1px solid #e4e8e6;
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

.frame-28 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-8 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-29 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-24 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  justify-content: space-between;
  padding: 12px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  border: 1px solid #e4e8e6;
}

.frame-31 {
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

.frame-32 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-9 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-33 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-27 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border: 1px solid #e4e8e6;
}

.text-28 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #6b7a72;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-35 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-36 {
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
  border: 1px solid #e4e8e6;
}

.frame-37 {
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

.frame-38 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-10 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-39 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
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
  color: #1c2024;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-32 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-40 {
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
  border: 1px solid #e4e8e6;
}

.frame-41 {
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

.frame-42 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-11 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-43 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-33 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-35 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-44 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border: 1px solid #e4e8e6;
}

.text-36 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-45 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-46 {
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
  border: 1px solid #e4e8e6;
}

.frame-47 {
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

.frame-48 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-12 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-49 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-38 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
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
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-40 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-50 {
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
  border: 1px solid #e4e8e6;
}

.frame-51 {
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

.frame-52 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-13 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-53 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-41 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-42 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-43 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-54 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
  background-color: #f4f6f5;
  border: 1px solid #e4e8e6;
}

.text-44 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0.6px;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-45 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-55 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: fit-content;
  flex: 0 0 auto;
}

.frame-56 {
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
  border: 1px solid #e4e8e6;
}

.frame-57 {
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

.frame-58 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #f4f6f5;
  border-radius: 9999px;
}

.vector-14 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-59 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-46 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-47 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-48 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-60 {
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
  border: 1px solid #e4e8e6;
}

.frame-61 {
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

.frame-62 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #eef2f0;
  border-radius: 9999px;
}

.vector-15 {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
}

.frame-63 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.text-49 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #1c2024;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-50 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-51 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-64 {
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
  background-color: #ffffff;
  border: 1px solid #e4e8e6;
}

.frame-65 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-16 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-52 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-66 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-17 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-53 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #0f5132;
  white-space: pre-wrap;
  word-break: break-word;
}

.frame-67 {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
}

.vector-18 {
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}

.text-54 {
  box-sizing: border-box;
  width: fit-content;
  height: fit-content;
  flex: 0 0 auto;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  -webkit-font-smoothing: antialiased;
  color: #6b7a72;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
