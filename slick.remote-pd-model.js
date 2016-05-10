(function($) {
  /***
   * A sample AJAX data store implementation.
   * Right now, it's hooked up to load search results from Octopart, but can
   * easily be extended to support any JSONP-compatible backend that accepts paging parameters.
   */
  function RemoteModel() {
    // private
    var PAGESIZE = 50;
    var data = {length: 0};
    var searchstr = "";
    var sortcol = null;
    var sortdir = 1;
    var pendingRequests = {};
    var h_request = null;
    var req = null; // ajax request
    var API_URL = '',
      defaults = {
        api_token: '',
        strict_mode: true,
        get_summary: 1,
        sort: 'add_time desc',
        type: 'deal',
        everyone: 1
      };

    // events
    var onDataLoading = new Slick.Event();
    var onDataLoaded = new Slick.Event();


    function init() {
    }

    function buildRequestUrl(endpoint, params) {
      return API_URL + endpoint + '?' + $.param($.extend(params, defaults));
    }


    function isDataLoaded(from, to) {
      for (var i = from; i <= to; i++) {
        if (data[i] == undefined || data[i] == null) {
          return false;
        }
      }

      return true;
    }


    function clear() {
      for (var key in data) {
        delete data[key];
      }
      data.length = 0;
    }


    function ensureData(from, to) {
      console.log('ensure: ' + from + ' - ' + to);
      if (from < 0) {
        from = 0;
      }

      if (data.length > 0) {
        to = Math.min(to, data.length - 1);
      }

      var fromPage = Math.floor(from / PAGESIZE);
      var toPage = Math.floor(to / PAGESIZE);

      while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage)
        fromPage++;

      while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage)
        toPage--;

      console.log('paginating', fromPage, toPage);

      if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
        // TODO:  look-ahead
        onDataLoaded.notify({from: from, to: to});
        return;
      }

      var params = {
        start: fromPage * PAGESIZE,
        limit: PAGESIZE
      };
      console.log('parameters', from, to, params);
      var url = buildRequestUrl('deals', params);
      if (pendingRequests[url]) {
        return;
      }
      /*
       if (req) {
       req.abort();
       for (var i = req.fromPage; i <= req.toPage; i++)
       data[i * PAGESIZE] = undefined;
       }*/

      if (h_request != null) {
        clearTimeout(h_request);
      }

      h_request = setTimeout(function() {
        for (var i = fromPage; i <= toPage; i++)
          data[i * PAGESIZE] = null; // null indicates a 'requested but not available yet'

        onDataLoading.notify({from: from, to: to});

        req = $.ajax({
          dataType: "json",
          url: url,
          cache: true,
          success: wrapSuccess(url),
          error: wrapError(url)
        });
        req.fromPage = fromPage;
        req.toPage = toPage;
        pendingRequests[url] = true;
      }, 50);
    }

    function wrapError(url) {
      return function onError(fromPage, toPage) {
        console.log("error loading pages " + fromPage + " to " + toPage);
        delete pendingRequests[url];
      };
    }


    function wrapSuccess(url) {
      return function onSuccess(body) {
        var responseData = body.data,
          from = body.additional_data.pagination.start, to = from + responseData.length;
        data.length = body.additional_data.summary.total_count;

        for (var i = 0; i < responseData.length; i++) {
          var item = responseData[i];

          data[from + i] = item;
          data[from + i].index = from + i;
        }

        req = null;

        onDataLoaded.notify({from: from, to: to});
        delete pendingRequests[url];
      };
    }


    function reloadData(from, to) {
      for (var i = from; i <= to; i++)
        delete data[i];

      ensureData(from, to);
    }


    function setSort(column, dir) {
      sortcol = column;
      sortdir = dir;
      clear();
    }

    function setSearch(str) {
      searchstr = str;
      clear();
    }


    init();

    return {
      // properties
      "data": data,

      // methods
      "clear": clear,
      "isDataLoaded": isDataLoaded,
      "ensureData": ensureData,
      "reloadData": reloadData,
      "setSort": setSort,
      "setSearch": setSearch,

      // events
      "onDataLoading": onDataLoading,
      "onDataLoaded": onDataLoaded
    };
  }

  // Slick.Data.RemoteModel
  $.extend(true, window, {Slick: {Data: {RemoteModel: RemoteModel}}});
})(jQuery);