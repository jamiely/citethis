const gulp = require('gulp');
const zip = require('gulp-zip');

gulp.task('archive', () =>
  gulp.src([
    'sidebar/*',
    'icons/*',
    'manifest.json'
    ], { base: '.' })
    .pipe(zip('extension.zip'))
    .pipe(gulp.dest('dist'))
);
