/*
* Automated Testing Kit configuration.
*/
module.exports = {
  operatingMode: "native",
  drushCmd: "drush",
  articleAddUrl: 'node/add/article',
  contactUsUrl: "contact/feedback",
  logInUrl: "user/login",
  logOutUrl: "user/logout",
  imageAddUrl: 'media/add/image',
  mediaDeleteUrl: 'media/{mid}/delete',
  mediaEditUrl: 'media/{mid}/edit',
  mediaList: 'admin/content/media',
  menuAddUrl: 'admin/structure/menu/manage/main/add',
  menuDeleteUrl: 'admin/structure/menu/item/{mid}/delete',
  menuEditUrl: 'admin/structure/menu/item/{mid}/edit',
  menuListUrl: 'admin/structure/menu/manage/main',
  nodeDeleteUrl: 'node/{nid}/delete',
  nodeEditUrl: 'node/{nid}/edit',
  pageAddUrl: 'node/add/page',
  registerUrl: "user/register",
  resetPasswordUrl: "user/password",
  termAddUrl: 'admin/structure/taxonomy/manage/tags/add',
  termEditUrl: 'taxonomy/term/{tid}/edit',
  termDeleteUrl: 'taxonomy/term/{tid}/delete',
  termListUrl: 'admin/structure/taxonomy/manage/tags/overview',
  termViewUrl: 'taxonomy/term/{tid}',
  xmlSitemapUrl: 'admin/config/search/xmlsitemap',
  authDir: "tests/support",
  dataDir: "tests/data",
  supportDir: "tests/support",
  testDir: "tests",
  pantheon : {
    isTarget: false,
    site: "aSite",
    environment: "dev"
  }
}
