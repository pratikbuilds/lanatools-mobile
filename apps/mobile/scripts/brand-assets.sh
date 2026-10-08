#!/usr/bin/env bash
# Renders the launcher icons and splash marks from the LanaTools "open port"
# mark (lanatools/apps/web/src/components/landing/brand.tsx). Needs
# rsvg-convert (brew install librsvg). Run from apps/mobile.
set -euo pipefail
out=assets/brand
mkdir -p "$out"

port='M16 56h-4q-4 0-4-4V15q0-7 7-7h23l19 12.5V29L37 16H19.5q-3.5 0-3.5 3.5Z'
prompt='M23 26l8 7-8 7'

# The mark in one colour, its caret lime unless a second colour is given.
mark() {
  local color=$1 caret=${2:-#d9ff4a}
  echo "<path d=\"$port\" fill=\"$color\"/><path d=\"$prompt\" fill=\"none\" stroke=\"$color\" stroke-width=\"4.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"35\" y=\"41\" width=\"15\" height=\"5\" rx=\"2.5\" fill=\"$caret\"/>"
}

render() {
  local name=$1 size=$2 svg=$3
  printf '%s' "$svg" | rsvg-convert -w "$size" -h "$size" -o "$out/$name"
}

# Legacy launcher icon: the favicon, a blue tile with the paper mark.
render icon.png 1024 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0b2fb2'/><g transform='translate(5 5) scale(0.84)'>$(mark '#f3efe6')</g></svg>"

# Adaptive icon layers on Android's 108dp canvas; the mark stays inside the
# 66dp safe zone. The mark's box is x 8..57, y 8..56 in its 64 grid.
adaptive="translate(23.4 24) scale(0.95)"
render adaptive-foreground.png 1024 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 108 108'><g transform='$adaptive'>$(mark '#f3efe6')</g></svg>"
render adaptive-monochrome.png 1024 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 108 108'><g transform='$adaptive'>$(mark '#000000' '#000000')</g></svg>"

# Splash marks: ink on paper by day, paper on near-black by night.
render splash-light.png 512 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>$(mark '#0a1f6e')</svg>"
render splash-dark.png 512 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>$(mark '#f3efe6')</svg>"
