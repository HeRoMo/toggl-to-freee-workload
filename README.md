# toggl track to freee workload

[Toggl Track](https://toggl.com/) のデータを Google Sheets にエクスポートして、
[freee工数管理](https://www.freee.co.jp/lp/project-management/202304_2/?utm_source=google&utm_medium=cpc&utm_campaign=lis1&gad_source=1&gclid=Cj0KCQjwudexBhDKARIsAI-GWYXqBjeqD4Fa1XZHWrv_E8CASc4OQx4voPvx6NuSu20N6WfkGHvXT6AaAtumEALw_wcB)
に登録する Google Sheets の Add-on です。

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

## Setup

次のコマンドでインストールできます。

```console
$ git clone https://github.com/HeRoMo/toggl-to-freee-workload.git
$ cd toggl-to-freee-workload
$ yarn 
$ clasp create --type sheets --rootDir src --title toggl-to-freee-workload
```

`clasp create` の `--title` オプションの値は任意で構いません。


## 事前準備

### 設定

[//]: # (TODO: 記述する)


### TOGGL_FREEE_MAP シートの作成

[//]: # (TODO: 記述する)

## 使い方

### 


## Push the codes and open in web editor
You can push the codes to GAS by the following command.

```console
$ yarn clasp:push
```

And you can open your GAS project in web editor by the following command.

```console
$ yarn clasp:open
```

## Linting

Run the following command, you can check the codes by ESLint.

```console
$ yarn lint
```

## Testing

Run the following command, you can test the codes by jest locally.

```console
$ yarn test
```

## LICENSE

[MIT](./LICENSE)
